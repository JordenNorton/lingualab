import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { billingPlanIds, billingPlans } from "@/lib/billing-plans";
import { PricingPlanAction } from "@/components/pricing-plan-action";
import { getCreditSummary } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const creditSummary = user ? await getCreditSummary(supabase) : null;
  const currentPlan = creditSummary?.plan ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-7 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-lagoon">
            IntoFluency
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Plans</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/62">
            Choose the monthly lesson allowance that fits your study rhythm. Credits reset each month and unused credits do not roll over.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="flex h-10 items-center rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          >
            {user ? "Dashboard" : "Log in"}
          </Link>
        </div>
      </header>

      {params.billing === "portal-update-setup" ? (
        <section className="rounded-lg border border-coral/20 bg-coral/10 p-4 text-sm text-ink/75">
          <p className="font-semibold text-ink">Plan changes need one more Stripe setting.</p>
          <p className="mt-1">
            In Stripe, enable Customer Portal subscription updates and allow the IntoFluency subscription products with the Starter, Standard, and Pro prices.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {billingPlanIds.map((planId) => {
          const plan = billingPlans[planId];
          const isCurrentPlan = currentPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={[
                "flex min-h-[330px] flex-col rounded-lg border bg-white p-5 shadow-soft",
                isCurrentPlan
                  ? "border-coral/45 ring-2 ring-coral/15"
                  : plan.featured
                    ? "border-lagoon/35 ring-2 ring-lagoon/10"
                    : "border-ink/10"
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{plan.name}</h2>
                  <p className="mt-1 text-sm font-medium text-lagoon">{plan.lessonsLabel}</p>
                </div>
                <PlanBadge featured={Boolean(plan.featured)} current={isCurrentPlan} />
              </div>

              <div className="mt-6">
                <p className="text-3xl font-semibold text-ink">
                  {plan.priceLabel}
                  <span className="text-base font-medium text-ink/55">/month</span>
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-ink/68">
                <PlanFeature>1 credit = 1 AI lesson</PlanFeature>
                <PlanFeature>2 explanations included per lesson</PlanFeature>
                <PlanFeature>Extra explanations use 1 credit</PlanFeature>
              </ul>

              <div className="mt-auto pt-6">
                <PricingPlanAction planId={plan.id} signedIn={Boolean(user)} current={isCurrentPlan} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function PlanBadge({ featured, current }: { featured: boolean; current: boolean }) {
  if (current) {
    return (
      <span className="rounded-md bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">
        Current plan
      </span>
    );
  }

  if (featured) {
    return (
      <span className="rounded-md bg-lagoon/10 px-2.5 py-1 text-xs font-semibold text-lagoon">
        Popular
      </span>
    );
  }

  return null;
}

function PlanFeature({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-lagoon" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
