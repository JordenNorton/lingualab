export const billingPlanIds = ["free", "starter", "standard", "pro"] as const;

export type BillingPlanId = (typeof billingPlanIds)[number];

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  lessonsLabel: string;
  credits: number;
  priceLabel: string;
  pricePence: number;
  stripePriceEnv?: string;
  featured?: boolean;
};

export const billingPlans: Record<BillingPlanId, BillingPlan> = {
  free: {
    id: "free",
    name: "Free",
    lessonsLabel: "3 lessons/month",
    credits: 3,
    priceLabel: "£0",
    pricePence: 0
  },
  starter: {
    id: "starter",
    name: "Starter",
    lessonsLabel: "30 lessons/month",
    credits: 30,
    priceLabel: "£4.99",
    pricePence: 499,
    stripePriceEnv: "STRIPE_PRICE_STARTER"
  },
  standard: {
    id: "standard",
    name: "Standard",
    lessonsLabel: "70 lessons/month",
    credits: 70,
    priceLabel: "£8.99",
    pricePence: 899,
    stripePriceEnv: "STRIPE_PRICE_STANDARD",
    featured: true
  },
  pro: {
    id: "pro",
    name: "Pro",
    lessonsLabel: "120 lessons/month",
    credits: 120,
    priceLabel: "£14.99",
    pricePence: 1499,
    stripePriceEnv: "STRIPE_PRICE_PRO"
  }
};

export const paidBillingPlans = billingPlanIds.filter((planId) => planId !== "free") as Exclude<BillingPlanId, "free">[];

export function getPlanPriceId(planId: BillingPlanId) {
  const plan = billingPlans[planId];
  if (!plan.stripePriceEnv) return null;

  return process.env[plan.stripePriceEnv] || null;
}

export function getPlanByStripePriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) return null;

  return paidBillingPlans
    .map((planId) => billingPlans[planId])
    .find((plan) => plan.stripePriceEnv && process.env[plan.stripePriceEnv] === priceId) ?? null;
}

export function isBillingPlanId(value: string): value is BillingPlanId {
  return billingPlanIds.includes(value as BillingPlanId);
}
