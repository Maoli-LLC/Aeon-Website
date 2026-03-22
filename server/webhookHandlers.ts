import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { billingProjects, billingInvoices } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

let webhookSecret: string | null = null;

async function getWebhookSecret(): Promise<string> {
  if (!webhookSecret) {
    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    webhookSecret = webhook.secret;
  }
  return webhookSecret!;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }

    const stripe = await getUncachableStripeClient();
    const secret = await getWebhookSecret();
    
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    
    return event;
  }

  static async handlePaymentSuccess(paymentLinkId: string, session: any): Promise<void> {
    let invoiceUpdated = false;

    if (session.metadata?.invoiceId) {
      const invoiceId = parseInt(session.metadata.invoiceId);
      if (!isNaN(invoiceId)) {
        const updateData: any = { paymentStatus: 'paid', paidAt: new Date(), updatedAt: new Date() };
        if (session.subscription) {
          updateData.stripeSubscriptionId = session.subscription;
        }
        await db.update(billingInvoices).set(updateData).where(eq(billingInvoices.id, invoiceId));
        console.log(`Invoice ${invoiceId} marked as paid${session.subscription ? ' (subscription: ' + session.subscription + ')' : ''}`);
        invoiceUpdated = true;
      }
    }

    if (!invoiceUpdated && paymentLinkId) {
      const invoices = await db.select().from(billingInvoices)
        .where(eq(billingInvoices.stripePaymentLinkId, paymentLinkId));
      for (const inv of invoices) {
        const updateData: any = { paymentStatus: 'paid', paidAt: new Date(), updatedAt: new Date() };
        if (session.subscription) updateData.stripeSubscriptionId = session.subscription;
        await db.update(billingInvoices).set(updateData).where(eq(billingInvoices.id, inv.id));
        console.log(`Invoice ${inv.id} marked as paid via payment link ID`);
        invoiceUpdated = true;
      }
    }

    if (!invoiceUpdated && session.metadata?.projectId) {
      const projectId = parseInt(session.metadata.projectId);
      if (!isNaN(projectId)) {
        const invoices = await db.select().from(billingInvoices)
          .where(eq(billingInvoices.projectId, projectId));
        const pendingInv = invoices.filter(inv => inv.paymentStatus === 'pending');
        if (pendingInv.length > 0) {
          const inv = pendingInv[0];
          const updateData: any = { paymentStatus: 'paid', paidAt: new Date(), updatedAt: new Date() };
          if (session.subscription) updateData.stripeSubscriptionId = session.subscription;
          await db.update(billingInvoices).set(updateData).where(eq(billingInvoices.id, inv.id));
          console.log(`Invoice ${inv.id} marked as paid via project match`);
          invoiceUpdated = true;
        }
      }
    }

    if (!invoiceUpdated) {
      let projects: any[] = [];
      if (paymentLinkId) {
        projects = await db.select().from(billingProjects)
          .where(eq(billingProjects.stripePaymentLinkId, paymentLinkId));
      }
      if (projects.length === 0 && session.metadata?.projectId) {
        const projectId = parseInt(session.metadata.projectId);
        if (!isNaN(projectId)) {
          projects = await db.select().from(billingProjects)
            .where(eq(billingProjects.id, projectId));
        }
      }
      for (const project of projects) {
        const updateData: any = { paymentStatus: 'paid', updatedAt: new Date() };
        if (session.subscription) updateData.stripeSubscriptionId = session.subscription;
        await db.update(billingProjects).set(updateData).where(eq(billingProjects.id, project.id));
        console.log(`Legacy project ${project.id}: ${project.projectName} marked as paid`);
      }
    }

    if (session.subscription) {
      let planEndDate = session.metadata?.planEndDate;
      
      if (!planEndDate) {
        try {
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          planEndDate = (sub.metadata as any)?.planEndDate;
        } catch {}
      }

      if (planEndDate) {
        try {
          const stripe = await getUncachableStripeClient();
          const endTimestamp = Math.floor(new Date(planEndDate).getTime() / 1000);
          await stripe.subscriptions.update(session.subscription as string, {
            cancel_at: endTimestamp,
          });
          console.log(`Set cancel_at on subscription ${session.subscription} to ${planEndDate}`);
        } catch (err: any) {
          console.error(`Failed to set cancel_at on subscription: ${err.message}`);
        }
      }
    }
  }

  static async handleSubscriptionCancelled(subscriptionId: string): Promise<void> {
    if (!subscriptionId) return;

    const invoices = await db.select().from(billingInvoices)
      .where(eq(billingInvoices.stripeSubscriptionId, subscriptionId));
    for (const inv of invoices) {
      await db.update(billingInvoices)
        .set({ paymentStatus: 'cancelled', stripeSubscriptionId: null, updatedAt: new Date() })
        .where(eq(billingInvoices.id, inv.id));
      console.log(`Subscription cancelled for invoice ${inv.id}`);
    }
    
    const projects = await db.select().from(billingProjects)
      .where(eq(billingProjects.stripeSubscriptionId, subscriptionId));
    for (const project of projects) {
      await db.update(billingProjects)
        .set({ 
          paymentStatus: 'cancelled', 
          projectStatus: 'cancelled',
          stripeSubscriptionId: null,
          updatedAt: new Date() 
        })
        .where(eq(billingProjects.id, project.id));
      console.log(`Subscription cancelled via webhook for legacy project ${project.id}: ${project.projectName}`);
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.cancel(subscriptionId);
    console.log(`Subscription cancelled: ${subscriptionId}`);
  }
}
