import { redirect } from "next/navigation";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { getCreditSummary } from "@/lib/credits";
import { billingPlans, getPlanPriceId, isBillingPlanId } from "@/lib/billing-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { ensureCustomerDefaultPaymentMethod, ensureSubscriptionDefaultPaymentMethod } from "@/lib/stripe-payment-methods";
import { syncStripeSubscription } from "@/lib/stripe-sync";

export const runtime = "nodejs";

async function getRequestedPlan(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { plan?: string } | null;
    return body?.plan ?? "";
  }

  const formData = await request.formData();
  const plan = formData.get("plan");

  return typeof plan === "string" ? plan : "";
}

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") || request.headers.get("content-type")?.includes("application/json");
}

function respondWithBillingUrl(request: Request, url: string) {
  if (wantsJson(request)) {
    return Response.json({ url });
  }

  redirect(url);
}

function isPortalUpdateSetupError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("subscription update feature") ||
    error.message.includes("must also be included in the configuration") ||
    error.message.includes("portal configuration")
  );
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase("Log in or create an account to choose a plan.");
  if ("response" in auth) return auth.response;

  const requestedPlan = await getRequestedPlan(request);
  if (!isBillingPlanId(requestedPlan)) {
    return Response.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  const summary = await getCreditSummary(auth.supabase);

  if (requestedPlan === "free") {
    if (summary?.stripeSubscriptionId && summary.stripeCustomerId && summary.plan !== "free") {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.update(summary.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      await syncStripeSubscription(subscription, auth.user.id);
    }

    return respondWithBillingUrl(request, "/dashboard?billing=cancelled");
  }

  const plan = billingPlans[requestedPlan];
  const priceId = getPlanPriceId(requestedPlan);

  if (!priceId) {
    return Response.json(
      {
        error: `${plan.name} billing is not configured yet.`
      },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  if (summary?.stripeCustomerId && summary.stripeSubscriptionId && summary.plan !== "free") {
    if (summary.plan !== requestedPlan) {
      const subscription = await stripe.subscriptions.retrieve(summary.stripeSubscriptionId);
      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        return Response.json(
          {
            error: "Your current subscription could not be loaded."
          },
          { status: 500 }
        );
      }

      try {
        await ensureSubscriptionDefaultPaymentMethod(stripe, summary.stripeCustomerId, summary.stripeSubscriptionId);

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: summary.stripeCustomerId,
          return_url: `${appUrl}/dashboard`,
          flow_data: {
            type: "subscription_update_confirm",
            subscription_update_confirm: {
              subscription: summary.stripeSubscriptionId,
              items: [
                {
                  id: subscriptionItem.id,
                  price: priceId,
                  quantity: subscriptionItem.quantity ?? 1
                }
              ]
            },
            after_completion: {
              type: "redirect",
              redirect: {
                return_url: `${appUrl}/dashboard?billing=updated`
              }
            }
          }
        });

        return respondWithBillingUrl(request, portalSession.url);
      } catch (error) {
        if (isPortalUpdateSetupError(error)) {
          console.error("Stripe portal subscription updates are not fully configured", error);
          return respondWithBillingUrl(request, "/pricing?billing=portal-update-setup");
        }

        throw error;
      }
    }

    await ensureSubscriptionDefaultPaymentMethod(stripe, summary.stripeCustomerId, summary.stripeSubscriptionId);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: summary.stripeCustomerId,
      return_url: `${appUrl}/dashboard`
    });

    return respondWithBillingUrl(request, portalSession.url);
  }

  let customerId = summary?.stripeCustomerId ?? null;
  const existingCustomerId = customerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.user.email ?? undefined,
      metadata: {
        user_id: auth.user.id
      }
    });
    customerId = customer.id;

    const admin = createAdminClient();
    await admin.from("billing_profiles").upsert(
      {
        user_id: auth.user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id"
      }
    );
  }

  if (existingCustomerId) {
    await ensureCustomerDefaultPaymentMethod(stripe, existingCustomerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: auth.user.id,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    allow_promotion_codes: true,
    payment_method_data: {
      allow_redisplay: "always"
    },
    saved_payment_method_options: {
      allow_redisplay_filters: ["always", "limited", "unspecified"]
    },
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/pricing?billing=cancelled`,
    metadata: {
      user_id: auth.user.id,
      plan: requestedPlan
    },
    subscription_data: {
      metadata: {
        user_id: auth.user.id,
        plan: requestedPlan
      }
    }
  });

  if (!session.url) {
    return Response.json({ error: "Stripe Checkout did not return a checkout URL." }, { status: 500 });
  }

  return respondWithBillingUrl(request, session.url);
}
