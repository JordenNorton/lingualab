create table if not exists public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  title text not null,
  target_language text not null,
  native_language text not null,
  level text not null,
  prompt text not null,
  success_criteria jsonb not null default '[]'::jsonb,
  answer text not null,
  feedback jsonb not null,
  score integer not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists writing_feedback_user_created_idx on public.writing_feedback (user_id, created_at desc);
create index if not exists writing_feedback_user_lesson_idx on public.writing_feedback (user_id, lesson_key, created_at desc);

alter table public.writing_feedback enable row level security;

drop policy if exists "Users can read own writing feedback" on public.writing_feedback;
drop policy if exists "Users can insert own writing feedback" on public.writing_feedback;
drop policy if exists "Users can delete own writing feedback" on public.writing_feedback;

create policy "Users can read own writing feedback"
  on public.writing_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own writing feedback"
  on public.writing_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own writing feedback"
  on public.writing_feedback
  for delete
  to authenticated
  using (auth.uid() = user_id);
