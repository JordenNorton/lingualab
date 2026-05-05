"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DashboardBillingActions({ hasStripeCustomer }: { hasStripeCustomer: boolean }) {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    if (isOpeningPortal) return;

    setIsOpeningPortal(true);
    setError("");

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Stripe billing could not be opened. Please try again.");
      }

      window.location.assign(data.url);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Stripe billing could not be opened. Please try again.");
      setIsOpeningPortal(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="flex h-10 items-center rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-graphite"
        >
          Change plan
        </Link>
        {hasStripeCustomer ? (
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon disabled:cursor-wait disabled:opacity-70"
            onClick={openPortal}
            disabled={isOpeningPortal}
          >
            {isOpeningPortal ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {isOpeningPortal ? "Opening Stripe" : "Manage billing"}
          </button>
        ) : null}
      </div>
      {error ? <p className="max-w-xs text-sm text-coral">{error}</p> : null}
    </div>
  );
}
