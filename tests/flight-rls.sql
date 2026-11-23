-- Run as administrator against a disposable database after the flight migration.
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000012');

set local role anon;
do $$
begin
  begin
    perform public.submit_flight_claim('AI202', current_date, 'DEL', 'BOM', 'manual', 1);
    raise exception 'anonymous submission succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform id from public.flight_claims;
    raise exception 'anonymous select succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011"}', true);

do $$
declare
  day date := (now() at time zone 'UTC')::date;
begin
  if public.submit_flight_claim('AI202', day, 'DEL', 'BOM', 'manual', 1) <> 'saved'
    or public.submit_flight_claim('AI202', day, 'DEL', 'BOM', 'barcode_text', 1) <> 'duplicate'
    or public.submit_flight_claim('AI203', day - 3, 'DEL', 'BOM', 'manual', 1) <> 'invalid'
    or public.submit_flight_claim('AI203', day + 367, 'DEL', 'BOM', 'manual', 1) <> 'invalid'
    or public.submit_flight_claim('AI203', day, 'DEL', 'BOM', 'manual', 0) <> 'invalid'
    or public.submit_flight_claim('AI203', day, 'DEL', 'DEL', 'manual', 1) <> 'invalid'
    or public.submit_flight_claim('AI203', day, 'DEL', 'BOM', 'unknown', 1) <> 'invalid'
  then raise exception 'submission result did not match its validation rules';
  end if;

  if (select count(*) from public.flight_claims) <> 1 or
    (select status from public.flight_claims) <> 'unverified' then
    raise exception 'wrong creation status or number of claims';
  end if;

  begin
    update public.flight_claims set status = 'verified';
    raise exception 'self-approval succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.flight_claims (user_id, flight_number, departure_date, origin, destination, source, consent_version)
    values ('00000000-0000-4000-8000-000000000011', 'AI204', day, 'DEL', 'BOM', 'manual', 1);
    raise exception 'direct insert succeeded';
  exception when insufficient_privilege then
    null;
  end;

  for flight in 211..229 loop
    if public.submit_flight_claim('AI' || flight::text, day, 'DEL', 'BOM', 'manual', 1) <> 'saved' then
      raise exception 'valid claim below limit failed';
    end if;
  end loop;
  if public.submit_flight_claim('AI230', day, 'DEL', 'BOM', 'manual', 1) <> 'limit' then
    raise exception 'quota did not reject additional claim';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000012"}', true);

do $$
declare
  affected_rows integer;
  day date := (now() at time zone 'UTC')::date;
begin
  if exists (select id from public.flight_claims) then raise exception 'cross-owner read succeeded'; end if;
  delete from public.flight_claims;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'cross-owner delete succeeded'; end if;
  if public.submit_flight_claim('AI202', day, 'DEL', 'BOM', 'manual', 1) <> 'saved' then
    raise exception 'duplicate constraint crossed owner boundary';
  end if;
  delete from public.flight_claims;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'owner delete failed'; end if;
end
$$;

reset role;
update public.flight_claims set expires_at = now() - interval '1 second' where flight_number = 'AI202';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011"}', true);

do $$
begin
  if (select count(*) from public.flight_claims) <> 19 then
    raise exception 'expired row remains visible';
  end if;
  if public.submit_flight_claim('AI202', (now() at time zone 'UTC')::date, 'DEL', 'BOM', 'manual', 1) <> 'saved' then
    raise exception 'expired row continued to block resubmission';
  end if;
end
$$;

rollback;
