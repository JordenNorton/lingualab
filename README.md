# LinguaLab

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
- [ ] Add `profiles` for user language preferences and current level
- [ ] Add `vocabulary_items` for saved terms and review state
- [ ] Add `review_events` for spaced repetition scheduling
- [ ] Add reminders with Supabase Cron or Edge Functions

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Supabase Auth
- Supabase Postgres with row-level security for saved lessons, quiz attempts, and writing feedback
- Browser `localStorage` for logged-out demo progress fallback

## Local Setup

```bash
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
```

Without an OpenAI API key, signed-in users can use demo mode with sample lesson, explanation, and feedback responses. Logged-out users can view the demo lesson, but generation and other credit-using text actions are locked behind auth.

Auth routes:

- `/signup`
- `/login`
- `/dashboard`

## Supabase Database Setup

Run the SQL files in `supabase/migrations` from the Supabase SQL editor.

This creates the `public.lessons`, `public.lesson_attempts`, and `public.writing_feedback` tables with row-level security policies so each authenticated user can only read and write their own learning data.

## Production

```bash
npm run build
npm run start
```

The easiest hosting path is Vercel. Add `OPENAI_API_KEY` and `OPENAI_MODEL` as project environment variables.

## Phase 2 Direction

Phase 2 is now mostly complete. The remaining work has moved into Phase 3: moving local progress into Supabase.

- `profiles`: user language preferences and current level
- `lessons`: generated texts and workbook JSON, already implemented for saved lessons
- `lesson_attempts`: quiz scores and timestamps, already implemented
- `writing_feedback`: writing prompt answers and feedback results, already implemented
- `vocabulary_items`: saved terms and review state
- `review_events`: spaced repetition schedule

Supabase Auth can handle accounts, and Supabase Cron or Edge Functions can schedule review reminders.
