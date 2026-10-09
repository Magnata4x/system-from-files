-- S3: additive signal persistence and lifecycle fields.
-- Existing rows remain readable; candle_open_time stays nullable for legacy rows.
alter table public.signals
  add column if not exists detected_at timestamptz,
  add column if not exists candle_open_time timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists result text,
  add column if not exists result_price numeric,
  add column if not exists invalidation_reason text,
  add column if not exists candles_elapsed integer not null default 0;

update public.signals
set detected_at = created_at
where detected_at is null;

alter table public.signals
  alter column detected_at set default now(),
  alter column detected_at set not null;

alter table public.signals
  add constraint signals_result_check
  check (result is null or result in ('tp1', 'sl', 'expired'))
  not valid;

alter table public.signals
  validate constraint signals_result_check;

alter table public.signals
  add constraint signals_candles_elapsed_nonnegative
  check (candles_elapsed >= 0)
  not valid;

alter table public.signals
  validate constraint signals_candles_elapsed_nonnegative;

-- One immutable signal per pair/timeframe/closed candle. Legacy rows without a
-- candle identity are deliberately excluded instead of receiving invented data.
create unique index if not exists signals_pair_timeframe_candle_uidx
  on public.signals (pair, timeframe, candle_open_time)
  where candle_open_time is not null;

create index if not exists signals_lifecycle_active_idx
  on public.signals (status, valid_until)
  where closed_at is null;

-- RLS remains the row-level boundary; SQL grants must also prevent client writes.
revoke insert, update, delete, truncate, references, trigger
  on table public.signals from anon, authenticated;
revoke all on table public.signals from anon;
grant select on table public.signals to authenticated;
grant select, insert, update, delete on table public.signals to service_role;

comment on column public.signals.detected_at is
  'Detection timestamp assigned by the trusted signal job; immutable after insert.';
comment on column public.signals.candle_open_time is
  'Open time of the closed market candle that produced this signal; idempotency key.';
comment on column public.signals.valid_until is
  'Deadline for the signal validity window.';
comment on column public.signals.result is
  'Terminal outcome: tp1, sl, or expired.';
