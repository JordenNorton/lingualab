# IntoFluency

AI-generated reading practice for language learners.

## Status

### Phase 1: Practice Studio

- [x] Lesson generation by target language, native language, CEFR level, format, tone, length, and focus area
- [x] Target-language reading text
- [x] Native-language explanations for selected text
- [x] Vocabulary and grammar notes
- [x] Workbook questions and fill-in-the-blank drills
- [x] Writing feedback
- [x] Local saved lessons and logged-out demo attempt history via browser `localStorage`
- [x] Demo mode when `OPENAI_API_KEY` is not configured

### Phase 2: Auth And Saved Lessons

- [x] Email/password signup and login with Supabase Auth
- [x] Email confirmation route at `/auth/confirm`
- [x] Server-side auth cookies via `@supabase/ssr`
- [x] Protected `/dashboard`
- [x] Logout action
- [x] Supabase-backed saved lesson storage
- [x] Dashboard list for saved lessons
- [x] Row-level security so authenticated users can only read and write their own lessons
- [x] Auth gate for credit-using text generation routes
- [x] Logged-out UI lock for lesson generation, explanations, and writing feedback

### Phase 3: Progress And Review

- [x] Move quiz attempts from browser `localStorage` into Supabase
- [x] Add a filtered quiz attempt history page
- [x] Store writing feedback history per user
- [x] Add `profiles` for user language preferences, current level, and accessibility settings
- [x] Add `usage_events` for per-user daily caps and short cooldowns on writing feedback
- [ ] Add profile roles and admin entitlements for future team/admin access
- [ ] Add `vocabulary_items` for saved terms and review state
- [ ] Add `review_events` for spaced repetition scheduling
- [ ] Add reminders with Supabase Cron or Edge Functions

### Phase 4: Billing And Monthly Credits

- [x] Add monthly credit balances in Supabase
- [x] Add Free, Starter, Standard, and Pro plan definitions
- [x] Deduct 1 credit for each generated AI lesson
- [x] Track 2 included explanations per lesson
- [x] Use 1 extra credit for explanation requests beyond the included amount
- [x] Block lesson generation when credits are exhausted
- [x] Show plan and remaining credits on the dashboard
- [x] Add a simple `/pricing` page
- [x] Add Stripe Checkout, Customer Portal, and webhook routes
- [x] Add RLS-protected billing, credit event, and explanation usage tables
- [ ] Add Stripe products, prices, webhook endpoint, and Vercel environment variables in production

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Supabase Auth
- Supabase Postgres with row-level security for profiles, saved lessons, quiz attempts, writing feedback, billing profiles, and credit usage
- Stripe Billing for monthly subscriptions
- Browser `localStorage` for logged-out demo progress fallback

## Local Setup

Use Node 22 before installing dependencies. The project includes an `.nvmrc` for this:

```bash
nvm use
npm install --legacy-peer-deps --cache ./.npm-cache
cp .env.example .env.local
npm run dev
```

Add your OpenAI key to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production: NEXT_PUBLIC_APP_URL=https://intofluency.app
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_from_stripe
STRIPE_PRICE_STARTER=price_starter_monthly
STRIPE_PRICE_STANDARD=price_standard_monthly
STRIPE_PRICE_PRO=price_pro_monthly
```

Keep `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` server-side only. Do not expose them with `NEXT_PUBLIC_` names.

Without an OpenAI API key, signed-in users can use demo mode with sample lesson, explanation, and feedback responses. Logged-out users can view the demo lesson, but generation and other lesson/credit actions are locked behind auth.

Auth routes:

- `/signup`
- `/login`
- `/dashboard`

## Supabase Database Setup

Run the SQL files in `supabase/migrations` from the Supabase SQL editor.

This creates the `public.profiles`, `public.lessons`, `public.lesson_attempts`, `public.writing_feedback`, and `public.usage_events` tables with row-level security policies so each authenticated user can only read and write their own learning data.

The billing migration also creates `public.billing_profiles`, `public.credit_events`, `public.lesson_explanation_usage`, and `public.stripe_events`. Users can read only their own billing and credit rows. Credit spending runs through server-side Postgres functions, and Stripe webhook processing uses the Supabase service role key.

## Stripe Setup

Create three recurring monthly prices in Stripe Billing:

- Starter: £4.99/month, 30 lessons/month
- Standard: £8.99/month, 70 lessons/month
- Pro: £14.99/month, 120 lessons/month

Copy the Stripe price IDs into `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_STANDARD`, and `STRIPE_PRICE_PRO`.

Enable the Stripe Customer Portal so users can manage, cancel, and update their subscription. In the portal configuration, turn on subscription updates and include the IntoFluency subscription products with the Starter, Standard, and Pro prices. Add a webhook endpoint pointing to:

```text
https://intofluency.app/api/stripe/webhook
```

Listen for these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Production

```bash
npm run build
npm run start
```

The easiest hosting path is Vercel. Add the OpenAI, Supabase, Stripe, and app URL environment variables listed above. Set `NEXT_PUBLIC_APP_URL` to `https://intofluency.app`.

## Manual Rebrand Checklist

- DNS/domain: point `intofluency.app` at the production Vercel project and add `www.intofluency.app` if you want the `www` redirect.
- Vercel project: add `intofluency.app` under Domains, then set `NEXT_PUBLIC_APP_URL=https://intofluency.app` for production.
- Supabase Auth: add `https://intofluency.app` to Site URL and add redirect URLs for `https://intofluency.app/auth/confirm` and any preview URLs you still use.
- Stripe products: rename the visible products from LinguaHub to IntoFluency, or recreate them as IntoFluency Starter, IntoFluency Standard, and IntoFluency Pro if you want cleaner product modelling.
- Stripe Customer Portal: ensure the portal subscription-update configuration includes the current IntoFluency products/prices.
- Stripe webhooks: update the production webhook endpoint to `https://intofluency.app/api/stripe/webhook` and copy the signing secret into Vercel.
- Stripe branding: update public business name, statement descriptor, support email, support URL, icon, and brand colour in Stripe.
- OpenAI/Supabase/Vercel email templates: update any visible old product names in confirmation, password reset, and billing emails.
- GitHub/repo housekeeping: optionally rename the repository and local folder from `lingualab` to `intofluency` after the deploy is stable.
- Analytics/search/social: update any metadata, favicon/social images, Search Console, analytics domains, and public links once those are added.

## Phase 2 Direction

Phase 2 is now mostly complete. The remaining work has moved into Phase 3: moving local progress into Supabase.

- `profiles`: user language preferences, current level, accessibility settings, and dashboard personalization, already implemented
- `lessons`: generated texts and workbook JSON, already implemented for saved lessons
- `lesson_attempts`: quiz scores and timestamps, already implemented
- `writing_feedback`: writing prompt answers and feedback results, already implemented
- `usage_events`: per-user writing feedback daily caps and cooldowns, already implemented
- `billing_profiles`: current plan, billing status, monthly credit balance, and renewal date, already implemented
- `credit_events`: server-side lesson credit ledger, already implemented
- `lesson_explanation_usage`: 2 included explanations per lesson plus extra credit usage, already implemented
- `profile roles`: future admin and team entitlement handling
- `vocabulary_items`: saved terms and review state
- `review_events`: spaced repetition schedule

Supabase Auth can handle accounts, and Supabase Cron or Edge Functions can schedule review reminders.
