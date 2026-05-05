create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'starter', 'standard', 'pro')),
  billing_status text not null default 'free',
  monthly_credit_allowance integer not null default 3 check (monthly_credit_allowance >= 0),
  credits_remaining integer not null default 3 check (credits_remaining >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  credit_period_start timestamptz not null default timezone('utc', now()),
  credit_period_end timestamptz not null default timezone('utc', now()) + interval '1 month',
  renewal_date timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_profiles_stripe_customer_idx
  on public.billing_profiles (stripe_customer_id);

create index if not exists billing_profiles_stripe_subscription_idx
  on public.billing_profiles (stripe_subscription_id);

create table if not exists public.credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('lesson_generation', 'extra_explanation', 'monthly_reset', 'plan_sync', 'credit_refund')),
  lesson_key text,
  credits_delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_events_user_created_idx
  on public.credit_events (user_id, created_at desc);

create index if not exists credit_events_user_lesson_idx
  on public.credit_events (user_id, lesson_key, created_at desc);

create table if not exists public.lesson_explanation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  included_count integer not null default 0 check (included_count >= 0),
  extra_credit_count integer not null default 0 check (extra_credit_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, lesson_key)
);

create index if not exists lesson_explanation_usage_user_updated_idx
  on public.lesson_explanation_usage (user_id, updated_at desc);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_profiles enable row level security;
alter table public.credit_events enable row level security;
alter table public.lesson_explanation_usage enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Users can read own billing profile" on public.billing_profiles;
drop policy if exists "Users can read own credit events" on public.credit_events;
drop policy if exists "Users can read own lesson explanation usage" on public.lesson_explanation_usage;

create policy "Users can read own billing profile"
  on public.billing_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read own credit events"
  on public.credit_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read own lesson explanation usage"
  on public.lesson_explanation_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.billing_plan_allowance(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'starter' then 30
    when 'standard' then 70
    when 'pro' then 120
    else 3
  end;
$$;

create or replace function public.ensure_billing_profile()
returns table (
  user_id uuid,
  plan text,
  billing_status text,
  monthly_credit_allowance integer,
  credits_remaining integer,
  credits_used integer,
  credit_period_start timestamptz,
  credit_period_end timestamptz,
  renewal_date timestamptz,
  cancel_at_period_end boolean,
  stripe_customer_id text,
  stripe_subscription_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_profile public.billing_profiles%rowtype;
  v_allowance integer;
begin
  if v_user_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':billing_credits'));

  insert into public.billing_profiles (
    user_id,
    plan,
    billing_status,
    monthly_credit_allowance,
    credits_remaining,
    credits_used,
    credit_period_start,
    credit_period_end,
    renewal_date
  )
  values (v_user_id, 'free', 'free', 3, 3, 0, v_now, v_now + interval '1 month', v_now + interval '1 month')
  on conflict on constraint billing_profiles_pkey do nothing;

  select *
    into v_profile
    from public.billing_profiles
    where billing_profiles.user_id = v_user_id
    for update;

  v_allowance := public.billing_plan_allowance(v_profile.plan);

  if v_profile.monthly_credit_allowance <> v_allowance then
    update public.billing_profiles
      set monthly_credit_allowance = v_allowance,
          credits_remaining = least(billing_profiles.credits_remaining, v_allowance),
          updated_at = v_now
      where billing_profiles.user_id = v_user_id
      returning * into v_profile;
  end if;

  if v_profile.credit_period_end <= v_now then
    update public.billing_profiles
      set credits_remaining = billing_profiles.monthly_credit_allowance,
          credits_used = 0,
          credit_period_start = v_now,
          credit_period_end = v_now + interval '1 month',
          renewal_date = v_now + interval '1 month',
          updated_at = v_now
      where billing_profiles.user_id = v_user_id
      returning * into v_profile;

    insert into public.credit_events (user_id, event_type, credits_delta, balance_after, metadata)
      values (v_user_id, 'monthly_reset', v_profile.credits_remaining, v_profile.credits_remaining, jsonb_build_object('plan', v_profile.plan));
  end if;

  return query
    select
      v_profile.user_id,
      v_profile.plan,
      v_profile.billing_status,
      v_profile.monthly_credit_allowance,
      v_profile.credits_remaining,
      v_profile.credits_used,
      v_profile.credit_period_start,
      v_profile.credit_period_end,
      v_profile.renewal_date,
      v_profile.cancel_at_period_end,
      v_profile.stripe_customer_id,
      v_profile.stripe_subscription_id;
end;
$$;

create or replace function public.consume_lesson_credit(p_lesson_key text)
returns table (
  allowed boolean,
  reason text,
  plan text,
  credits_remaining integer,
  monthly_credit_allowance integer,
  credit_period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_profile public.billing_profiles%rowtype;
begin
  if v_user_id is null then
    return query select false, 'unauthenticated', 'free', 0, 3, v_now + interval '1 month';
    return;
  end if;

  if coalesce(trim(p_lesson_key), '') = '' then
    return query select false, 'invalid_lesson', 'free', 0, 3, v_now + interval '1 month';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':billing_credits'));

  insert into public.billing_profiles (
    user_id,
    plan,
    billing_status,
    monthly_credit_allowance,
    credits_remaining,
    credits_used,
    credit_period_start,
    credit_period_end,
    renewal_date
  )
  values (v_user_id, 'free', 'free', 3, 3, 0, v_now, v_now + interval '1 month', v_now + interval '1 month')
  on conflict on constraint billing_profiles_pkey do nothing;

  select *
    into v_profile
    from public.billing_profiles
    where billing_profiles.user_id = v_user_id
    for update;

  if v_profile.credit_period_end <= v_now then
    update public.billing_profiles
      set credits_remaining = billing_profiles.monthly_credit_allowance,
          credits_used = 0,
          credit_period_start = v_now,
          credit_period_end = v_now + interval '1 month',
          renewal_date = v_now + interval '1 month',
          updated_at = v_now
      where billing_profiles.user_id = v_user_id
      returning * into v_profile;

    insert into public.credit_events (user_id, event_type, credits_delta, balance_after, metadata)
      values (v_user_id, 'monthly_reset', v_profile.credits_remaining, v_profile.credits_remaining, jsonb_build_object('plan', v_profile.plan));
  end if;

  if v_profile.plan <> 'free' and v_profile.billing_status not in ('active', 'trialing') then
    return query
      select false, 'inactive_subscription', v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance, v_profile.credit_period_end;
    return;
  end if;

  if v_profile.credits_remaining < 1 then
    return query
      select false, 'no_credits', v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance, v_profile.credit_period_end;
    return;
  end if;

  update public.billing_profiles
    set credits_remaining = billing_profiles.credits_remaining - 1,
        credits_used = billing_profiles.credits_used + 1,
        updated_at = v_now
    where billing_profiles.user_id = v_user_id
    returning * into v_profile;

  insert into public.credit_events (user_id, event_type, lesson_key, credits_delta, balance_after, metadata)
    values (v_user_id, 'lesson_generation', p_lesson_key, -1, v_profile.credits_remaining, jsonb_build_object('plan', v_profile.plan));

  return query
    select true, null::text, v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance, v_profile.credit_period_end;
end;
$$;

create or replace function public.record_lesson_explanation_usage(p_lesson_key text)
returns table (
  allowed boolean,
  reason text,
  plan text,
  credits_remaining integer,
  monthly_credit_allowance integer,
  credit_period_end timestamptz,
  included_used integer,
  included_limit integer,
  charged_credits integer,
  extra_credit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_profile public.billing_profiles%rowtype;
  v_usage public.lesson_explanation_usage%rowtype;
  v_included_limit integer := 2;
begin
  if v_user_id is null then
    return query select false, 'unauthenticated', 'free', 0, 3, v_now + interval '1 month', 0, v_included_limit, 0, 0;
    return;
  end if;

  if coalesce(trim(p_lesson_key), '') = '' then
    return query select false, 'invalid_lesson', 'free', 0, 3, v_now + interval '1 month', 0, v_included_limit, 0, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':billing_credits'));

  insert into public.billing_profiles (
    user_id,
    plan,
    billing_status,
    monthly_credit_allowance,
    credits_remaining,
    credits_used,
    credit_period_start,
    credit_period_end,
    renewal_date
  )
  values (v_user_id, 'free', 'free', 3, 3, 0, v_now, v_now + interval '1 month', v_now + interval '1 month')
  on conflict on constraint billing_profiles_pkey do nothing;

  select *
    into v_profile
    from public.billing_profiles
    where billing_profiles.user_id = v_user_id
    for update;

  if v_profile.credit_period_end <= v_now then
    update public.billing_profiles
      set credits_remaining = billing_profiles.monthly_credit_allowance,
          credits_used = 0,
          credit_period_start = v_now,
          credit_period_end = v_now + interval '1 month',
          renewal_date = v_now + interval '1 month',
          updated_at = v_now
      where billing_profiles.user_id = v_user_id
      returning * into v_profile;

    insert into public.credit_events (user_id, event_type, credits_delta, balance_after, metadata)
      values (v_user_id, 'monthly_reset', v_profile.credits_remaining, v_profile.credits_remaining, jsonb_build_object('plan', v_profile.plan));
  end if;

  insert into public.lesson_explanation_usage (user_id, lesson_key)
    values (v_user_id, p_lesson_key)
    on conflict on constraint lesson_explanation_usage_pkey do nothing;

  select *
    into v_usage
    from public.lesson_explanation_usage
    where lesson_explanation_usage.user_id = v_user_id
      and lesson_explanation_usage.lesson_key = p_lesson_key
    for update;

  if v_usage.included_count < v_included_limit then
    update public.lesson_explanation_usage
      set included_count = lesson_explanation_usage.included_count + 1,
          updated_at = v_now
      where lesson_explanation_usage.user_id = v_user_id
        and lesson_explanation_usage.lesson_key = p_lesson_key
      returning * into v_usage;

    return query
      select true, null::text, v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance,
        v_profile.credit_period_end, v_usage.included_count, v_included_limit, 0, v_usage.extra_credit_count;
    return;
  end if;

  if v_profile.plan <> 'free' and v_profile.billing_status not in ('active', 'trialing') then
    return query
      select false, 'inactive_subscription', v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance,
        v_profile.credit_period_end, v_usage.included_count, v_included_limit, 0, v_usage.extra_credit_count;
    return;
  end if;

  if v_profile.credits_remaining < 1 then
    return query
      select false, 'no_credits', v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance,
        v_profile.credit_period_end, v_usage.included_count, v_included_limit, 0, v_usage.extra_credit_count;
    return;
  end if;

  update public.billing_profiles
    set credits_remaining = billing_profiles.credits_remaining - 1,
        credits_used = billing_profiles.credits_used + 1,
        updated_at = v_now
    where billing_profiles.user_id = v_user_id
    returning * into v_profile;

  update public.lesson_explanation_usage
    set extra_credit_count = lesson_explanation_usage.extra_credit_count + 1,
        updated_at = v_now
    where lesson_explanation_usage.user_id = v_user_id
      and lesson_explanation_usage.lesson_key = p_lesson_key
    returning * into v_usage;

  insert into public.credit_events (user_id, event_type, lesson_key, credits_delta, balance_after, metadata)
    values (
      v_user_id,
      'extra_explanation',
      p_lesson_key,
      -1,
      v_profile.credits_remaining,
      jsonb_build_object('plan', v_profile.plan, 'included_limit', v_included_limit)
    );

  return query
    select true, null::text, v_profile.plan, v_profile.credits_remaining, v_profile.monthly_credit_allowance,
      v_profile.credit_period_end, v_usage.included_count, v_included_limit, 1, v_usage.extra_credit_count;
end;
$$;

create or replace function public.refund_lesson_credit(p_lesson_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_profile public.billing_profiles%rowtype;
  v_has_charge boolean := false;
  v_has_refund boolean := false;
begin
  if v_user_id is null or coalesce(trim(p_lesson_key), '') = '' then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':billing_credits'));

  select exists (
    select 1
      from public.credit_events
      where credit_events.user_id = v_user_id
        and credit_events.lesson_key = p_lesson_key
        and credit_events.event_type = 'lesson_generation'
  ) into v_has_charge;

  select exists (
    select 1
      from public.credit_events
      where credit_events.user_id = v_user_id
        and credit_events.lesson_key = p_lesson_key
        and credit_events.event_type = 'credit_refund'
  ) into v_has_refund;

  if not v_has_charge or v_has_refund then
    return;
  end if;

  update public.billing_profiles
    set credits_remaining = least(billing_profiles.credits_remaining + 1, billing_profiles.monthly_credit_allowance),
        credits_used = greatest(billing_profiles.credits_used - 1, 0),
        updated_at = v_now
    where billing_profiles.user_id = v_user_id
    returning * into v_profile;

  insert into public.credit_events (user_id, event_type, lesson_key, credits_delta, balance_after, metadata)
    values (v_user_id, 'credit_refund', p_lesson_key, 1, v_profile.credits_remaining, jsonb_build_object('reason', 'lesson_generation_failed'));
end;
$$;

create or replace function public.refund_lesson_explanation_usage(p_lesson_key text, p_charged_credits integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_profile public.billing_profiles%rowtype;
begin
  if v_user_id is null or coalesce(trim(p_lesson_key), '') = '' then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':billing_credits'));

  if p_charged_credits > 0 then
    update public.lesson_explanation_usage
      set extra_credit_count = greatest(lesson_explanation_usage.extra_credit_count - 1, 0),
          updated_at = v_now
      where lesson_explanation_usage.user_id = v_user_id
        and lesson_explanation_usage.lesson_key = p_lesson_key;

    update public.billing_profiles
      set credits_remaining = least(billing_profiles.credits_remaining + 1, billing_profiles.monthly_credit_allowance),
          credits_used = greatest(billing_profiles.credits_used - 1, 0),
          updated_at = v_now
      where billing_profiles.user_id = v_user_id
      returning * into v_profile;

    insert into public.credit_events (user_id, event_type, lesson_key, credits_delta, balance_after, metadata)
      values (v_user_id, 'credit_refund', p_lesson_key, 1, v_profile.credits_remaining, jsonb_build_object('reason', 'explanation_failed'));
  else
    update public.lesson_explanation_usage
      set included_count = greatest(lesson_explanation_usage.included_count - 1, 0),
          updated_at = v_now
      where lesson_explanation_usage.user_id = v_user_id
        and lesson_explanation_usage.lesson_key = p_lesson_key;
  end if;
end;
$$;
