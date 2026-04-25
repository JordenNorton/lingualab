# LinguaLab

AI-generated reading practice for language learners.

Phase 1 includes:

- Lesson generation by target language, native language, CEFR level, format, tone, length, and focus area
- Target-language reading text
- Native-language explanations for selected text
- Vocabulary and grammar notes
- Workbook questions, fill-in-the-blank drills, writing feedback, and local progress history
- Demo mode when `OPENAI_API_KEY` is not configured

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Browser localStorage for the Phase 1 progress prototype

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
```

Without an API key, the app runs in demo mode with a sample lesson.

## Production

```bash
npm run build
npm run start
```

The easiest hosting path is Vercel. Add `OPENAI_API_KEY` and `OPENAI_MODEL` as project environment variables.

## Phase 2 Direction

Move local progress into Supabase:

- `profiles`: user language preferences and current level
- `lessons`: generated texts and workbook JSON
- `lesson_attempts`: quiz scores, writing feedback, and timestamps
- `vocabulary_items`: saved terms and review state
- `review_events`: spaced repetition schedule

Supabase Auth can handle accounts, and Supabase Cron or Edge Functions can schedule review reminders.
