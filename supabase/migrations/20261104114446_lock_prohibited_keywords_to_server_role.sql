-- This table is not used by browser code. Keep it available to the server
-- service role only, and deny access to public, anon, and authenticated roles.
alter table public.prohibited_keywords enable row level security;

revoke all on table public.prohibited_keywords
  from public, anon, authenticated;
