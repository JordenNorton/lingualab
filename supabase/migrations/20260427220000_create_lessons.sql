create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  title text not null,
  target_language text not null,
  native_language text not null,
  level text not null,
  content_type text not null,
  lesson jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_key)
);

create index if not exists lessons_user_created_idx on public.lessons (user_id, created_at desc);

alter table public.lessons enable row level security;

drop policy if exists "Users can read own lessons" on public.lessons;
drop policy if exists "Users can insert own lessons" on public.lessons;
drop policy if exists "Users can update own lessons" on public.lessons;
drop policy if exists "Users can delete own lessons" on public.lessons;

create policy "Users can read own lessons"
  on public.lessons
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own lessons"
  on public.lessons
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own lessons"
  on public.lessons
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own lessons"
  on public.lessons
  for delete
  to authenticated
  using (auth.uid() = user_id);
