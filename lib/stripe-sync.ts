import "server-only";

import Stripe from "stripe";
import { billingPlans, getPlanByStripePriceId } from "@/lib/billing-plans";
import { createAdminClient } from "@/lib/supabase/admin";

type BillingProfileRow = {
  user_id: string;
  plan: string;
  monthly_credit_allowance: number;
  credits_remaining: number;
  credits_used: number;
  credit_period_start: string;
};

function toIso(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toISOString();
}

function monthFromNow() {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function getCustomerId(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id;
}

function getSubscriptionPrice(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? null;
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const start = firstItem?.current_period_start ?? subscription.start_date ?? subscription.created;
  const end = firstItem?.current_period_end ?? subscription.cancel_at ?? subscription.ended_at ?? subscription.created;

  return {
    start: toIso(start),
    end: toIso(end)
  };
}

function isSameStripePeriod(existingStart: string | null | undefined, stripeStart: string) {
  if (!existingStart) return false;

  const existingTime = new Date(existingStart).getTime();
  const stripeTime = new Date(stripeStart).getTime();

  if (Number.isNaN(existingTime) || Number.isNaN(stripeTime)) return false;

  return existingTime === stripeTime;
}

async function findUserIdForSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  if (fallbackUserId) return fallbackUserId;
  if (subscription.metadata.user_id) return subscription.metadata.user_id;

  const supabase = createAdminClient();
  const customerId = getCustomerId(subscription.customer);

  const { data } = await supabase
    .from("billing_profiles")
    .select("user_id")
    .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
    .limit(1)
    .maybeSingle<{ user_id: string }>();

  return data?.user_id ?? null;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const userId = await findUserIdForSubscription(subscription, fallbackUserId);
  if (!userId) {
    console.warn("Stripe subscription could not be matched to a user", subscription.id);
    return;
  }

  const supabase = createAdminClient();
  const priceId = getSubscriptionPrice(subscription);
  const matchedPlan = getPlanByStripePriceId(priceId);

  if (!matchedPlan && subscription.status !== "canceled") {
    console.warn("Stripe subscription price is not mapped to an IntoFluency plan", priceId);
    return;
  }

  const { data: existing } = await supabase
    .from("billing_profiles")
    .select("user_id, plan, monthly_credit_allowance, credits_remaining, credits_used, credit_period_start")
    .eq("user_id", userId)
    .maybeSingle<BillingProfileRow>();

  const customerId = getCustomerId(subscription.customer);
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const isCanceled = subscription.status === "canceled";
  const plan = isCanceled ? billingPlans.free : matchedPlan ?? billingPlans.free;
  const period = isActive ? getSubscriptionPeriod(subscription) : { start: new Date().toISOString(), end: monthFromNow() };
  const isNewBillingPeriod = isActive && (!existing || !isSameStripePeriod(existing.credit_period_start, period.start));
  const creditState = getSyncedCreditState({
    existing,
    isActive,
    isCanceled,
    isNewBillingPeriod,
    newAllowance: plan.credits
  });

  const { error } = await supabase.from("billing_profiles").upsert(
    {
      user_id: userId,
      plan: plan.id,
      billing_status: isCanceled ? "free" : subscription.status,
      monthly_credit_allowance: plan.credits,
      credits_remaining: creditState.remaining,
      credits_used: creditState.used,
      credit_period_start: period.start,
      credit_period_end: period.end,
      renewal_date: period.end,
      stripe_customer_id: customerId,
      stripe_subscription_id: isCanceled ? null : subscription.id,
      stripe_price_id: isCanceled ? null : priceId,
      cancel_at_period_end: isCanceled ? false : subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) throw error;

  if (isNewBillingPeriod || isCanceled || existing?.plan !== plan.id) {
    await supabase.from("credit_events").insert({
      user_id: userId,
      event_type: isActive && isNewBillingPeriod ? "monthly_reset" : "plan_sync",
      credits_delta: creditState.remaining - (existing?.credits_remaining ?? 0),
      balance_after: creditState.remaining,
      metadata: {
        plan: plan.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        billing_status: subscription.status
      }
    });
  }
}

function getSyncedCreditState({
  existing,
  isActive,
  isCanceled,
  isNewBillingPeriod,
  newAllowance
}: {
  existing: BillingProfileRow | null;
  isActive: boolean;
  isCanceled: boolean;
  isNewBillingPeriod: boolean;
  newAllowance: number;
}) {
  if (isCanceled) {
    return {
      remaining: billingPlans.free.credits,
      used: 0
    };
  }

  if (!isActive) {
    return {
      remaining: Math.min(existing?.credits_remaining ?? newAllowance, newAllowance),
      used: existing?.credits_used ?? 0
    };
  }

  if (!existing || isNewBillingPeriod) {
    return {
      remaining: newAllowance,
      used: 0
    };
  }

  const earnedRemaining = Math.max(newAllowance - existing.credits_used, 0);
  const isUpgradeOrSamePlan = newAllowance >= existing.monthly_credit_allowance;

  return {
    remaining: isUpgradeOrSamePlan ? earnedRemaining : Math.min(existing.credits_remaining, earnedRemaining),
    used: existing.credits_used
  };
}
