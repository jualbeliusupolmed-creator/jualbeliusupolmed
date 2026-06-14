-- Migration: pwa_installs tracking table
-- Run this in Supabase SQL Editor

create table if not exists pwa_installs (
  id uuid primary key default gen_random_uuid(),
  user_agent text,
  created_at timestamptz default now()
);
