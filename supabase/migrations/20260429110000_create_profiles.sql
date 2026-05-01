create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  profile_picture_url text not null default '',
  short_bio text not null default '',
  learning_goal text not null default '',
  target_language text not null default 'Spanish',
  native_language text not null default 'English',
  current_level text not null default 'A2' check (current_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  region_variant text not null default '',
  font_size text not null default 'default' check (font_size in ('small', 'default', 'large', 'extra-large')),
  high_contrast boolean not null default false,
  dyslexia_assist boolean not null default false,
  theme_preference text not null default 'system' check (theme_preference in ('system', 'light', 'dark')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);
