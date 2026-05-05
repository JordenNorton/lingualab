import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { ensureSubscriptionDefaultPaymentMethod } from "@/lib/stripe-payment-methods";
import { syncStripeSubscription } from "@/lib/stripe-sync";

export const runtime = "nodejs";

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const invoiceWithParent = invoice as Stripe.Invoice & {
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription;
      };
    };
  };
  const subscription = invoiceWithParent.parent?.subscription_details?.subscription;

  return typeof subscription === "string" ? subscription : subscription?.id ?? null;
}

function getCustomerId(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    return Response.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle<{ id: string }>();

  if (existingEvent) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await ensureSubscriptionDefaultPaymentMethod(stripe, getCustomerId(subscription.customer), subscription.id);
          await syncStripeSubscription(subscription, session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await ensureSubscriptionDefaultPaymentMethod(stripe, getCustomerId(subscription.customer), subscription.id);
          await syncStripeSubscription(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return Response.json({ error: "Stripe webhook handling failed." }, { status: 500 });
  }

  const { error: eventInsertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type
  });

  if (eventInsertError?.code !== "23505" && eventInsertError) {
    console.error("Stripe event idempotency insert failed", eventInsertError);
    return Response.json({ error: "Stripe event could not be recorded." }, { status: 500 });
  }

  return Response.json({ received: true });
}
