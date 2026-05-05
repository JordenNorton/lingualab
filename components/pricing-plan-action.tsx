"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent, MouseEvent } from "react";

export function PricingPlanAction({ planId, signedIn, current = false }: { planId: string; signedIn: boolean; current?: boolean }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);

  async function submitPlan() {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plan: planId })
    });
    const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

    if (!response.ok || !data?.url) {
      throw new Error(data?.error || "Stripe could not be opened. Please try again.");
    }

    window.location.assign(data.url);
  }

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await submitPlan();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Stripe could not be opened. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function confirmFreePlan(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await submitPlan();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Your subscription could not be cancelled. Please try again.");
      setIsSubmitting(false);
      setShowFreeConfirm(false);
    }
  }

  if (!signedIn) {
    return (
      <Link
        href="/signup"
        className="flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-graphite"
      >
        Create account
      </Link>
    );
  }

  if (current) {
    return (
      <Link
        href="/dashboard"
        className="flex h-11 w-full items-center justify-center rounded-md border border-coral/25 bg-coral/10 px-4 text-sm font-semibold text-coral transition hover:border-coral/45"
      >
        Current plan
      </Link>
    );
  }

  if (planId === "free") {
    return (
      <>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-md border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          onClick={() => {
            setError("");
            setShowFreeConfirm(true);
          }}
        >
          Use Free
        </button>
        {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
        {showFreeConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="free-plan-title">
            <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p id="free-plan-title" className="text-lg font-semibold text-ink">
                    Switch to Free?
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    Your paid subscription will be cancelled at the end of the current billing period. You will keep your current plan until then, then move to 3 lessons per month.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
                  onClick={() => setShowFreeConfirm(false)}
                  aria-label="Close"
                  disabled={isSubmitting}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="flex h-10 items-center justify-center rounded-md border border-ink/15 px-3 text-sm font-semibold text-ink transition hover:border-lagoon/50 hover:text-lagoon disabled:cursor-wait disabled:opacity-70"
                  onClick={() => setShowFreeConfirm(false)}
                  disabled={isSubmitting}
                >
                  Keep paid plan
                </button>
                <button
                  type="button"
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white transition hover:bg-graphite disabled:cursor-wait disabled:opacity-70"
                  onClick={confirmFreePlan}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                  {isSubmitting ? "Cancelling" : "Confirm switch"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <form method="post" action="/api/billing/checkout" onSubmit={startCheckout}>
      <input type="hidden" name="plan" value={planId} />
      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-graphite disabled:cursor-wait disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? "Opening Stripe" : "Choose plan"}
      </button>
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
    </form>
  );
}
