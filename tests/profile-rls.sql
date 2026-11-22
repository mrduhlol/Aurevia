-- Run as a database administrator against a disposable database after applying the migration.
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

set local role anon;
do $$
begin
  begin
    perform display_name from public.profiles;
    raise exception 'anon unexpectedly has profile access';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001"}', true);

insert into public.profiles (user_id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'First fixture');

do $$
begin
  if (select count(*) from public.profiles) <> 1
    or (select discoverable from public.profiles) is distinct from false
  then
    raise exception 'own profile or private default was incorrect';
  end if;

  begin
    insert into public.profiles (user_id, display_name)
    values ('00000000-0000-4000-8000-000000000002', 'Wrong owner');
    raise exception 'cross-owner insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.profiles set user_id = '00000000-0000-4000-8000-000000000002';
    raise exception 'ownership transfer unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.profiles set avatar_path = 'private/file.png';
    raise exception 'avatar update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.profiles set display_name = '   ';
    raise exception 'invalid display name unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
end
$$;

insert into public.profiles (user_id, display_name, bio, discoverable)
values ('00000000-0000-4000-8000-000000000001', 'Updated fixture', 'Private bio', true)
on conflict (user_id) do update set
  user_id = excluded.user_id,
  display_name = excluded.display_name,
  bio = excluded.bio,
  discoverable = excluded.discoverable;

do $$
begin
  if (select discoverable from public.profiles) is distinct from true
    or (select display_name from public.profiles) <> 'Updated fixture'
  then
    raise exception 'own-profile upsert did not persist';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002"}', true);

do $$
declare
  affected_rows integer;
begin
  if exists (select user_id from public.profiles) then
    raise exception 'another user can see an opted-in profile';
  end if;

  update public.profiles set bio = 'Wrong owner' where user_id = '00000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'cross-owner update unexpectedly succeeded';
  end if;
end
$$;

rollback;
