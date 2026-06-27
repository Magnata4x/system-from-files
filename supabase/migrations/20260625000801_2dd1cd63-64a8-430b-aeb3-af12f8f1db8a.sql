create table if not exists public.user_notifications (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null,
  title       text        not null,
  body        text,
  created_at  timestamptz not null default now(),
  read        boolean     not null default false,
  dismissed   boolean     not null default false
);

grant select, insert, update, delete on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

alter table public.user_notifications enable row level security;

create policy "Users manage own notifications"
  on public.user_notifications for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);