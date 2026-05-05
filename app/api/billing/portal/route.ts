import { redirect } from "next/navigation";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { getCreditSummary } from "@/lib/credits";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { ensureCustomerDefaultPaymentMethod, ensureSubscriptionDefaultPaymentMethod } from "@/lib/stripe-payment-methods";

export const runtime = "nodejs";

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json");
}

function respondWithBillingUrl(request: Request, url: string) {
  if (wantsJson(request)) {
    return Response.json({ url });
  }

  redirect(url);
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase("Log in to manage billing.");
  if ("response" in auth) return auth.response;

  const summary = await getCreditSummary(auth.supabase);

  if (!summary?.stripeCustomerId) {
    return respondWithBillingUrl(request, "/pricing");
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  if (summary.stripeSubscriptionId) {
    await ensureSubscriptionDefaultPaymentMethod(stripe, summary.stripeCustomerId, summary.stripeSubscriptionId);
  } else {
    await ensureCustomerDefaultPaymentMethod(stripe, summary.stripeCustomerId);
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: summary.stripeCustomerId,
    return_url: `${appUrl}/dashboard`
  });

  return respondWithBillingUrl(request, portalSession.url);
}
