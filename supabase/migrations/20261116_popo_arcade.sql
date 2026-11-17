-- POPO Arcade — Player Leaderboard, Competitions & Rewards Schema
-- Idempotent migration: safe to run against the existing Zblal Supabase database.
-- Preserves existing tables: customers, subcities, locations, service_priorities, service_requests.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. arcade_players
-- Private phone numbers are stored here and NEVER exposed via public RLS/views.
-- ---------------------------------------------------------------------------
create table if not exists public.arcade_players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24),
  phone_number text not null,
  phone_number_normalized text not null unique,
  status text not null default 'active' check (status in ('active', 'flagged', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_arcade_players_status
  on public.arcade_players (status);

create index if not exists idx_arcade_players_created_at
  on public.arcade_players (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. arcade_competitions
-- Daily and Weekly competitions anchored to Africa/Addis_Ababa by default.
-- ---------------------------------------------------------------------------
create table if not exists public.arcade_competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  competition_type text not null check (competition_type in ('daily', 'weekly')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Africa/Addis_Ababa',
  eligible_games text[] not null default array['poop-man', 'toilet-basketball']::text[],
  prize_description text not null default '',
  status text not null default 'active' check (status in ('upcoming', 'active', 'completed', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arcade_competitions_window_valid check (ends_at > starts_at)
);

create index if not exists idx_arcade_competitions_status_window
  on public.arcade_competitions (status, competition_type, starts_at desc, ends_at desc);

-- ---------------------------------------------------------------------------
-- 3. arcade_scores
-- Single-run validated scores with duplicate-session guard and server timestamps.
-- ---------------------------------------------------------------------------
create table if not exists public.arcade_scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.arcade_players (id) on delete cascade,
  game_id text not null check (
    game_id in ('poop-man', 'toilet-basketball', 'poop-drop', 'poop-run', 'dont-drop-the-poop')
  ),
  score integer not null check (score >= 0),
  played_at timestamptz not null default now(),
  competition_id uuid null references public.arcade_competitions (id) on delete set null,
  validation_status text not null default 'valid' check (validation_status in ('valid', 'flagged', 'rejected')),
  validation_reason text null,
  session_id text not null check (char_length(btrim(session_id)) between 8 and 128),
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint arcade_scores_unique_session unique (game_id, session_id)
);

create index if not exists idx_arcade_scores_leaderboard
  on public.arcade_scores (game_id, validation_status, score desc, played_at asc);

create index if not exists idx_arcade_scores_player_game
  on public.arcade_scores (player_id, game_id, score desc, played_at asc);

create index if not exists idx_arcade_scores_played_at
  on public.arcade_scores (played_at desc);

create index if not exists idx_arcade_scores_competition
  on public.arcade_scores (competition_id)
  where competition_id is not null;

-- ---------------------------------------------------------------------------
-- 4. arcade_winners
-- Manual admin review workflow (pending -> approved/rejected; prize unclaimed -> awarded).
-- ---------------------------------------------------------------------------
create table if not exists public.arcade_winners (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.arcade_competitions (id) on delete cascade,
  player_id uuid not null references public.arcade_players (id) on delete cascade,
  game_id text null check (
    game_id is null or game_id in ('poop-man', 'toilet-basketball', 'poop-drop', 'poop-run', 'dont-drop-the-poop')
  ),
  winner_type text not null check (winner_type in ('overall', 'per_game')),
  rank integer not null default 1 check (rank >= 1),
  final_score integer not null default 0 check (final_score >= 0),
  competition_points integer not null default 0 check (competition_points >= 0),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  prize_status text not null default 'unclaimed' check (prize_status in ('unclaimed', 'contacted', 'awarded', 'forfeited')),
  admin_note text not null default '',
  approved_at timestamptz null,
  awarded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_arcade_winners_overall_unique
  on public.arcade_winners (competition_id, player_id)
  where winner_type = 'overall';

create unique index if not exists idx_arcade_winners_per_game_unique
  on public.arcade_winners (competition_id, game_id, player_id)
  where winner_type = 'per_game';

create index if not exists idx_arcade_winners_competition
  on public.arcade_winners (competition_id, winner_type, rank asc);

-- ---------------------------------------------------------------------------
-- 5. arcade_winner_audit_logs
-- Immutable audit trail of winner approval and prize status transitions.
-- ---------------------------------------------------------------------------
create table if not exists public.arcade_winner_audit_logs (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references public.arcade_winners (id) on delete cascade,
  competition_id uuid not null references public.arcade_competitions (id) on delete cascade,
  action text not null,
  previous_approval_status text null,
  new_approval_status text null,
  previous_prize_status text null,
  new_prize_status text null,
  admin_note text not null default '',
  actor_email text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists idx_arcade_winner_audit_winner
  on public.arcade_winner_audit_logs (winner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Automatic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.arcade_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_arcade_players_updated_at on public.arcade_players;
create trigger trg_arcade_players_updated_at
  before update on public.arcade_players
  for each row execute function public.arcade_touch_updated_at();

drop trigger if exists trg_arcade_competitions_updated_at on public.arcade_competitions;
create trigger trg_arcade_competitions_updated_at
  before update on public.arcade_competitions
  for each row execute function public.arcade_touch_updated_at();

drop trigger if exists trg_arcade_winners_updated_at on public.arcade_winners;
create trigger trg_arcade_winners_updated_at
  before update on public.arcade_winners
  for each row execute function public.arcade_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies
-- All private phone numbers and writes go strictly through server endpoints
-- authenticated with SUPABASE_SERVICE_ROLE_KEY.
-- ---------------------------------------------------------------------------
alter table public.arcade_players enable row level security;
alter table public.arcade_competitions enable row level security;
alter table public.arcade_scores enable row level security;
alter table public.arcade_winners enable row level security;
alter table public.arcade_winner_audit_logs enable row level security;

-- Lock down direct table privileges from anon/authenticated roles so raw phone
-- numbers and unvalidated scores can never be read or written from the browser.
revoke all on public.arcade_players from anon, authenticated;
revoke all on public.arcade_scores from anon, authenticated;
revoke all on public.arcade_winners from anon, authenticated;
revoke all on public.arcade_winner_audit_logs from anon, authenticated;

-- Allow public read-only access only to non-disabled competition metadata.
revoke all on public.arcade_competitions from anon, authenticated;
grant select on public.arcade_competitions to anon, authenticated;

drop policy if exists "Public can view active or scheduled competitions" on public.arcade_competitions;
create policy "Public can view active or scheduled competitions"
  on public.arcade_competitions
  for select
  to anon, authenticated
  using (status in ('upcoming', 'active', 'completed'));

-- Explicit deny-all public policies on sensitive/write tables (service_role bypasses RLS).
drop policy if exists "Deny direct public access to arcade_players" on public.arcade_players;
create policy "Deny direct public access to arcade_players"
  on public.arcade_players
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct public access to arcade_scores" on public.arcade_scores;
create policy "Deny direct public access to arcade_scores"
  on public.arcade_scores
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct public access to arcade_winners" on public.arcade_winners;
create policy "Deny direct public access to arcade_winners"
  on public.arcade_winners
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct public access to arcade_winner_audit_logs" on public.arcade_winner_audit_logs;
create policy "Deny direct public access to arcade_winner_audit_logs"
  on public.arcade_winner_audit_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);
