import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type CreditSummaryRow = {
  user_id: string;
  plan: string;
  billing_status: string;
  monthly_credit_allowance: number;
  credits_remaining: number;
  credits_used: number;
  credit_period_start: string;
  credit_period_end: string;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type CreditSpendRow = {
  allowed: boolean;
  reason: "unauthenticated" | "invalid_lesson" | "inactive_subscription" | "no_credits" | null;
  plan: string;
  credits_remaining: number;
  monthly_credit_allowance: number;
  credit_period_end: string;
};

type ExplanationSpendRow = CreditSpendRow & {
  included_used: number;
  included_limit: number;
  charged_credits: number;
  extra_credit_count: number;
};

export type CreditSummary = {
  plan: string;
  billingStatus: string;
  allowance: number;
  remaining: number;
  used: number;
  periodStart: string;
  resetAt: string;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type CreditAllowed = {
  allowed: true;
  credits: Pick<CreditSummary, "plan" | "allowance" | "remaining" | "resetAt">;
};

type ExplanationAllowed = CreditAllowed & {
  includedUsed: number;
  includedLimit: number;
  chargedCredits: number;
  extraCreditCount: number;
};

type CreditBlocked = {
  allowed: false;
  response: Response;
};

function toCreditSummary(row: CreditSummaryRow): CreditSummary {
  return {
    plan: row.plan,
    billingStatus: row.billing_status,
    allowance: row.monthly_credit_allowance,
    remaining: row.credits_remaining,
    used: row.credits_used,
    periodStart: row.credit_period_start,
    resetAt: row.credit_period_end,
    renewalDate: row.renewal_date,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id
  };
}

function creditMeta(row: CreditSpendRow) {
  return {
    plan: row.plan,
    remaining: row.credits_remaining,
    allowance: row.monthly_credit_allowance,
    resetAt: row.credit_period_end
  };
}

function blockedCreditResponse(row: CreditSpendRow, context: "lesson" | "explanation") {
  const status = row.reason === "unauthenticated" ? 401 : row.reason === "invalid_lesson" ? 400 : 402;
  const exhaustedMessage =
    context === "lesson"
      ? "You're out of lesson credits for this month. View plans to keep generating lessons."
      : "You've used the 2 included explanations for this lesson and have no credits left for another one.";
  const message =
    row.reason === "no_credits"
      ? exhaustedMessage
      : row.reason === "inactive_subscription"
        ? "Your billing needs a quick check before more lessons can be generated."
        : row.reason === "invalid_lesson"
          ? "This lesson could not be matched to your credits."
          : "Log in or create an account to use lesson credits.";

  return {
    allowed: false as const,
    response: Response.json(
      {
        error: message,
        reason: row.reason,
        upgradeUrl: "/pricing",
        credits: creditMeta(row)
      },
      { status }
    )
  };
}

export async function getCreditSummary(supabase: SupabaseClient): Promise<CreditSummary | null> {
  const { data, error } = await supabase.rpc("ensure_billing_profile").single<CreditSummaryRow>();

  if (error || !data) {
    console.error("Billing profile unavailable", error);
    return null;
  }

  return toCreditSummary(data);
}

export async function consumeLessonCredit(supabase: SupabaseClient, lessonKey: string): Promise<CreditAllowed | CreditBlocked> {
  const { data, error } = await supabase
    .rpc("consume_lesson_credit", {
      p_lesson_key: lessonKey
    })
    .single<CreditSpendRow>();

  if (error || !data) {
    console.error("Lesson credit check failed", error);

    return {
      allowed: false,
      response: Response.json(
        {
          error: "Lesson credits could not be checked. Please try again."
        },
        { status: 500 }
      )
    };
  }

  if (!data.allowed) return blockedCreditResponse(data, "lesson");

  return {
    allowed: true,
    credits: creditMeta(data)
  };
}

export async function recordExplanationCreditUsage(
  supabase: SupabaseClient,
  lessonKey: string
): Promise<ExplanationAllowed | CreditBlocked> {
  const { data, error } = await supabase
    .rpc("record_lesson_explanation_usage", {
      p_lesson_key: lessonKey
    })
    .single<ExplanationSpendRow>();

  if (error || !data) {
    console.error("Explanation credit check failed", error);

    return {
      allowed: false,
      response: Response.json(
        {
          error: "Explanation credits could not be checked. Please try again."
        },
        { status: 500 }
      )
    };
  }

  if (!data.allowed) return blockedCreditResponse(data, "explanation");

  return {
    allowed: true,
    credits: creditMeta(data),
    includedUsed: data.included_used,
    includedLimit: data.included_limit,
    chargedCredits: data.charged_credits,
    extraCreditCount: data.extra_credit_count
  };
}

export async function refundLessonCredit(supabase: SupabaseClient, lessonKey: string) {
  const { error } = await supabase.rpc("refund_lesson_credit", {
    p_lesson_key: lessonKey
  });

  if (error) {
    console.error("Lesson credit refund failed", error);
  }
}

export async function refundExplanationUsage(supabase: SupabaseClient, lessonKey: string, chargedCredits: number) {
  const { error } = await supabase.rpc("refund_lesson_explanation_usage", {
    p_lesson_key: lessonKey,
    p_charged_credits: chargedCredits
  });

  if (error) {
    console.error("Explanation usage refund failed", error);
  }
}
