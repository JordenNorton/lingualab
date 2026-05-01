create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  units integer not null default 1 check (units > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists usage_events_user_feature_created_idx
  on public.usage_events (user_id, feature, created_at desc);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "Users can read own usage events" on public.usage_events;
drop policy if exists "Users can insert own usage events" on public.usage_events;

create policy "Users can read own usage events"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own usage events"
  on public.usage_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create or replace function public.record_usage_event(
  p_feature text,
  p_units integer,
  p_daily_limit integer,
  p_cooldown_seconds integer
)
returns table (
  allowed boolean,
  reason text,
  feature text,
  units integer,
  used_today integer,
  remaining_today integer,
  daily_limit integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_day_start timestamptz := date_trunc('day', timezone('utc', now())) at time zone 'utc';
  v_reset_at timestamptz := (date_trunc('day', timezone('utc', now())) + interval '1 day') at time zone 'utc';
  v_latest_created_at timestamptz;
  v_used_today integer := 0;
  v_retry_after integer := 0;
begin
  if v_user_id is null then
    return query select false, 'unauthenticated', p_feature, p_units, 0, 0, p_daily_limit, v_reset_at, null::integer;
    return;
  end if;

  if p_units < 1 or p_daily_limit < 1 or p_cooldown_seconds < 0 then
    return query select false, 'invalid_limit', p_feature, p_units, 0, 0, p_daily_limit, v_reset_at, null::integer;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':' || p_feature));

  select usage_events.created_at
    into v_latest_created_at
    from public.usage_events
    where usage_events.user_id = v_user_id
      and usage_events.feature = p_feature
    order by usage_events.created_at desc
    limit 1;

  if v_latest_created_at is not null and p_cooldown_seconds > 0 then
    v_retry_after := p_cooldown_seconds - floor(extract(epoch from (v_now - v_latest_created_at)))::integer;

    if v_retry_after > 0 then
      select coalesce(sum(usage_events.units), 0)::integer
        into v_used_today
        from public.usage_events
        where usage_events.user_id = v_user_id
          and usage_events.feature = p_feature
          and usage_events.created_at >= v_day_start
          and usage_events.created_at < v_reset_at;

      return query
        select false, 'cooldown', p_feature, p_units, v_used_today,
          greatest(p_daily_limit - v_used_today, 0), p_daily_limit, v_reset_at, v_retry_after;
      return;
    end if;
  end if;

  select coalesce(sum(usage_events.units), 0)::integer
    into v_used_today
    from public.usage_events
    where usage_events.user_id = v_user_id
      and usage_events.feature = p_feature
      and usage_events.created_at >= v_day_start
      and usage_events.created_at < v_reset_at;

  if v_used_today + p_units > p_daily_limit then
    return query
      select false, 'daily_limit', p_feature, p_units, v_used_today,
        greatest(p_daily_limit - v_used_today, 0), p_daily_limit, v_reset_at, null::integer;
    return;
  end if;

  insert into public.usage_events (user_id, feature, units)
    values (v_user_id, p_feature, p_units);

  return query
    select true, null::text, p_feature, p_units, v_used_today + p_units,
      greatest(p_daily_limit - (v_used_today + p_units), 0), p_daily_limit, v_reset_at, null::integer;
end;
$$;
