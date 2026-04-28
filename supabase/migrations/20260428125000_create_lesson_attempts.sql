create table if not exists public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  title text not null,
  target_language text not null,
  level text not null,
  score integer not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lesson_attempts_user_created_idx on public.lesson_attempts (user_id, created_at desc);

alter table public.lesson_attempts enable row level security;

drop policy if exists "Users can read own lesson attempts" on public.lesson_attempts;
drop policy if exists "Users can insert own lesson attempts" on public.lesson_attempts;
drop policy if exists "Users can delete own lesson attempts" on public.lesson_attempts;

create policy "Users can read own lesson attempts"
  on public.lesson_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own lesson attempts"
  on public.lesson_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own lesson attempts"
  on public.lesson_attempts
  for delete
  to authenticated
  using (auth.uid() = user_id);
