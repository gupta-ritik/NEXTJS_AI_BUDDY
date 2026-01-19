-- Supabase setup script (idempotent)
-- Run in Supabase Dashboard -> SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS, unique indexes, and DO blocks for constraints.

-- Enable UUID generation (gen_random_uuid)
create extension if not exists "pgcrypto";

-- ==============================
-- Users table (auth data)
-- NOTE: This project primarily uses public.app_users; keep public.users only if you need it.
-- ==============================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  first_name text,
  last_name text,
  name text,
  created_at timestamptz not null default now()
);

-- ==============================
-- app_users table (AI Study Buddy app table)
-- ==============================
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
);

alter table public.app_users
  add column if not exists password_hash text,
  add column if not exists verified boolean default false,
  add column if not exists verification_token text,
  add column if not exists provider text,
  add column if not exists google_id text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists mobile text,
  add column if not exists created_at timestamptz default now(),

  -- Roles + credits
  add column if not exists role text not null default 'free',
  add column if not exists credits integer not null default 0,

  -- Gamification (Daily Challenge)
  add column if not exists xp integer not null default 0,
  add column if not exists daily_streak integer not null default 0,
  add column if not exists best_daily_streak integer not null default 0,
  add column if not exists last_daily_challenge_date date,

  -- Referrals
  add column if not exists referral_code text,
  add column if not exists referred_by uuid null;

-- ==============================
-- Daily AI Challenge
-- 5 questions/day, mixed difficulty, XP + streaks
-- ==============================

create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_challenge_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  idx integer not null,
  question text not null,
  options jsonb not null,
  answer text not null,
  explanation text,
  difficulty text not null default 'medium',
  topic text,
  created_at timestamptz not null default now(),
  unique (challenge_id, idx)
);

create index if not exists idx_daily_challenge_questions_challenge
  on public.daily_challenge_questions (challenge_id, idx);

create table if not exists public.daily_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  answers jsonb not null,
  score integer not null,
  total_questions integer not null,
  xp_earned integer not null default 0,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index if not exists idx_daily_challenge_attempts_user
  on public.daily_challenge_attempts (user_id, completed_at desc);

-- Enforce unique referral codes (idempotent)
create unique index if not exists ux_app_users_referral_code
  on public.app_users(referral_code)
  where referral_code is not null;

-- Optional: non-unique index for quick lookup
create index if not exists idx_app_users_referral_code
  on public.app_users(referral_code);

-- Optional: FK safety for referred_by (idempotent)
-- Postgres doesn't support "ADD CONSTRAINT IF NOT EXISTS", so use a DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_referred_by_fkey'
  ) then
    alter table public.app_users
      add constraint app_users_referred_by_fkey
      foreign key (referred_by) references public.app_users(id);
  end if;
end $$;

-- ==============================
-- Expenses table (manual expenses + AI fields)
-- NOTE: Not used by AI Study Buddy features; included because it was requested.
-- ==============================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  userid uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null,
  category text not null default 'Uncategorized',
  note text not null default '',
  date timestamptz not null,
  "aiCategory" text,
  "rawInput" text,
  suggestion text,
  created_at timestamptz not null default now()
);

alter table public.expenses
  add column if not exists userid uuid,
  add column if not exists amount numeric(12,2),
  add column if not exists category text not null default 'Uncategorized',
  add column if not exists note text not null default '',
  add column if not exists date timestamptz not null,
  add column if not exists "aiCategory" text,
  add column if not exists "rawInput" text,
  add column if not exists suggestion text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_expenses_userid_date
  on public.expenses (userid, date desc);

-- ==============================
-- Optional (RECOMMENDED): atomic credits adjust RPC
-- Prevents race conditions when debiting/refunding credits.
-- Required by app/api/auth/user-repository.ts for best concurrency behavior.
-- ==============================
create or replace function public.sb_adjust_credits(
  p_user_id uuid,
  p_delta integer,
  p_require_non_negative boolean default false
)
returns integer
language plpgsql
security definer
as $$
declare
  new_credits integer;
begin
  update public.app_users
  set credits = case
    when p_require_non_negative then greatest(0, credits + p_delta)
    else credits + p_delta
  end
  where id = p_user_id
    and (not p_require_non_negative or (credits + p_delta) >= 0)
  returning credits into new_credits;

  if not found then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return new_credits;
end;
$$;

revoke all on function public.sb_adjust_credits(uuid, integer, boolean) from public;
grant execute on function public.sb_adjust_credits(uuid, integer, boolean) to service_role;
