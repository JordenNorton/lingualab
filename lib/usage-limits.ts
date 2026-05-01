import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const usageLimits = {
  lesson_generation: {
    label: "lesson generation",
    dailyLimit: 10,
    cooldownSeconds: 60,
    units: 1
  },
  explanation: {
    label: "explanations",
    dailyLimit: 40,
    cooldownSeconds: 8,
    units: 1
  },
  writing_feedback: {
    label: "writing feedback",
    dailyLimit: 20,
    cooldownSeconds: 30,
    units: 1
  }
} as const;

export type UsageFeature = keyof typeof usageLimits;

type UsageRpcRow = {
  allowed: boolean;
  reason: "cooldown" | "daily_limit" | "invalid_limit" | "unauthenticated" | null;
  feature: string;
  units: number;
  used_today: number;
  remaining_today: number;
  daily_limit: number;
  reset_at: string;
  retry_after_seconds: number | null;
};

type UsageAllowed = {
  allowed: true;
  feature: UsageFeature;
  units: number;
  remaining: number;
  limit: number;
  resetAt: string;
};

type UsageBlocked = {
  allowed: false;
  response: Response;
};

export async function recordUsageEvent(
  supabase: SupabaseClient,
  feature: UsageFeature
): Promise<UsageAllowed | UsageBlocked> {
  const config = usageLimits[feature];
  const { data, error } = await supabase
    .rpc("record_usage_event", {
      p_feature: feature,
      p_units: config.units,
      p_daily_limit: config.dailyLimit,
      p_cooldown_seconds: config.cooldownSeconds
    })
    .single<UsageRpcRow>();

  if (error || !data) {
    return {
      allowed: false,
      response: Response.json(
        {
          error: "Usage limits could not be checked. Please try again."
        },
        { status: 500 }
      )
    };
  }

  if (data.allowed) {
    return {
      allowed: true,
      feature,
      units: data.units,
      remaining: data.remaining_today,
      limit: data.daily_limit,
      resetAt: data.reset_at
    };
  }

  if (data.reason === "cooldown") {
    const retryAfter = Math.max(data.retry_after_seconds ?? config.cooldownSeconds, 1);

    return {
      allowed: false,
      response: Response.json(
        {
          error: `Please wait ${retryAfter} seconds before using ${config.label} again.`,
          feature,
          retryAfter,
          remaining: data.remaining_today,
          limit: data.daily_limit,
          resetAt: data.reset_at
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter)
          }
        }
      )
    };
  }

  if (data.reason === "daily_limit") {
    return {
      allowed: false,
      response: Response.json(
        {
          error: `You have reached today's ${config.label} limit. Try again tomorrow.`,
          feature,
          remaining: data.remaining_today,
          limit: data.daily_limit,
          resetAt: data.reset_at
        },
        { status: 429 }
      )
    };
  }

  return {
    allowed: false,
    response: Response.json(
      {
        error: "This request could not be recorded against your usage allowance."
      },
      { status: data.reason === "unauthenticated" ? 401 : 400 }
    )
  };
}
