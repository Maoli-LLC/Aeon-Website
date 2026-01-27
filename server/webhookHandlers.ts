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

  static async handlePaymentSuccess(paymentLinkId: string): Promise<void> {
    if (!paymentLinkId) return;
    
    const projects = await db.select().from(billingProjects)
      .where(eq(billingProjects.stripePaymentLinkId, paymentLinkId));
    
    for (const project of projects) {
      await db.update(billingProjects)
        .set({ paymentStatus: 'paid', updatedAt: new Date() })
        .where(eq(billingProjects.id, project.id));
      console.log(`Payment marked as paid for project ${project.id}: ${project.projectName}`);
    }
  }
}
