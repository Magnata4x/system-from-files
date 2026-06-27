create table if not exists public.user_preferences (
  user_id         uuid    primary key references auth.users(id) on delete cascade,
  compact_pill    boolean not null default false,
  onboarding_done boolean not null default false,
  wishlist        text[]  not null default '{}',
  updated_at      timestamptz not null default now()
);

grant select, insert, update, delete on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;

alter table public.user_preferences enable row level security;

create policy "Users manage own prefs"
  on public.user_preferences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);