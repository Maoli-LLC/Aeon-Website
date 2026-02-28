import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { billingProjects } from '@shared/schema';
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
    if (!paymentLinkId) return;
    
    const projects = await db.select().from(billingProjects)
      .where(eq(billingProjects.stripePaymentLinkId, paymentLinkId));
    
    for (const project of projects) {
      const updateData: any = { paymentStatus: 'paid', updatedAt: new Date() };
      
      if (session.subscription) {
        updateData.stripeSubscriptionId = session.subscription;
      }
      
      await db.update(billingProjects)
        .set(updateData)
        .where(eq(billingProjects.id, project.id));
      console.log(`Payment marked as paid for project ${project.id}: ${project.projectName}${session.subscription ? ' (subscription: ' + session.subscription + ')' : ''}`);
    }
  }

  static async handleSubscriptionCancelled(subscriptionId: string): Promise<void> {
    if (!subscriptionId) return;
    
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
      console.log(`Subscription cancelled via webhook for project ${project.id}: ${project.projectName}`);
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.cancel(subscriptionId);
    console.log(`Subscription cancelled: ${subscriptionId}`);
  }
}
