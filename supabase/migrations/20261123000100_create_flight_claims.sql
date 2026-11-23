begin;

-- Each owner-visible row is one verification request and its normalized flight claim.
create table public.flight_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_number text not null check (
    flight_number ~ '^[A-Z0-9]{2}[1-9][0-9]{0,3}[A-Z]?$'
    and left(flight_number, 2) ~ '[A-Z]'
  ),
  departure_date date not null,
  origin text not null check (origin ~ '^[A-Z]{3}$'),
  destination text not null check (destination ~ '^[A-Z]{3}$' and destination <> origin),
  source text not null check (source in ('manual', 'barcode_text')),
  status text not null default 'unverified' check (status = 'unverified'),
  consent_version integer not null check (consent_version = 1),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '720 hours'),
  unique (user_id, flight_number, departure_date, origin, destination)
);

create index flight_claims_expiration_idx on public.flight_claims (expires_at);

alter table public.flight_claims enable row level security;
revoke all on public.flight_claims from public, anon, authenticated;
grant select, delete on public.flight_claims to authenticated;

create policy flight_claims_select_own on public.flight_claims
  for select to authenticated
  using (user_id = (select auth.uid()) and expires_at > now());

create policy flight_claims_delete_own on public.flight_claims
  for delete to authenticated
  using (user_id = (select auth.uid()) and expires_at > now());

create function public.submit_flight_claim(
  p_flight_number text,
  p_departure_date date,
  p_origin text,
  p_destination text,
  p_source text,
  p_consent_version integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimant uuid := auth.uid();
  utc_today date := (now() at time zone 'UTC')::date;
begin
  if claimant is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_departure_date is null or p_departure_date < utc_today - 2
    or p_departure_date > utc_today + 366
    or p_consent_version is distinct from 1
    or p_flight_number is null or octet_length(p_flight_number) not between 3 and 7
    or p_origin is null or octet_length(p_origin) <> 3
    or p_destination is null or octet_length(p_destination) <> 3
    or p_source is null or octet_length(p_source) > 12 then
    return 'invalid';
  end if;

  -- Serialize inserts for each owner so concurrent requests respect the active-claim limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(claimant::text, 0));

  delete from public.flight_claims where user_id = claimant and expires_at <= now();

  if exists (
    select 1 from public.flight_claims
    where user_id = claimant and flight_number = p_flight_number
      and departure_date = p_departure_date and origin = p_origin and destination = p_destination
  ) then
    return 'duplicate';
  end if;

  if (select count(*) from public.flight_claims where user_id = claimant) >= 20 then
    return 'limit';
  end if;

  insert into public.flight_claims (
    user_id, flight_number, departure_date, origin, destination, source, consent_version
  ) values (claimant, p_flight_number, p_departure_date, p_origin, p_destination, p_source, p_consent_version);

  return 'saved';
exception when check_violation or not_null_violation then
  return 'invalid';
end;
$$;

revoke all on function public.submit_flight_claim(text, date, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.submit_flight_claim(text, date, text, text, text, integer)
  to authenticated;

commit;
