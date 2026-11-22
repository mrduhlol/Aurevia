begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (display_name = btrim(display_name) and char_length(display_name) between 1 and 60
      and display_name !~ '[[:cntrl:]]'),
  bio text check (bio is null or char_length(bio) between 1 and 240),
  avatar_path text check (avatar_path is null or (
    avatar_path like (user_id::text || '/%') and char_length(avatar_path) <= 200
  )),
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select (user_id, display_name, bio, avatar_path, discoverable, created_at, updated_at)
  on public.profiles to authenticated;
grant insert (user_id, display_name, bio, discoverable),
  update (user_id, display_name, bio, discoverable)
  on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profile_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

commit;
