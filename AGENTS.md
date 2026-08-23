# Jual Beli USU Polmed — Working Context

Read this file before changing code, infrastructure, or documentation.

## Project boundary

This is a marketplace for the USU/POLMED community. It includes a Next.js web
application and admin panel, a Supabase backend, and a separate WhatsApp bot.
Treat customer phone numbers, chat contents, payment records, authentication
data, and WhatsApp session files as private production data.

## Canonical systems

| Component | Expected home | Notes |
| --- | --- | --- |
| Web and API | This repository, `main` | Next.js 14 App Router; deployed on Vercel. |
| Database, Auth, Storage | Supabase | Do not make schema changes outside reviewed SQL migrations. |
| WhatsApp bot | `jualbeliusupolmed-creator/wa-bot-usu` | Runs under PM2 behind Nginx on the VPS. The `bot-wa/` directory here is a working copy and may drift. |

Before deploying or editing the bot, establish which checkout and Git commit is
the source of truth. Never overwrite an uncommitted VPS worktree.

## Safety rules

- Never put secrets in source code, documentation, Git remotes, issue comments,
  screenshots, or chat. Refer only to environment-variable names.
- Never commit `.env*`, WhatsApp session directories, customer data, bot state,
  private keys, or infrastructure credential notes.
- Never print production data or secrets into logs, test output, or generated
  reports. Use aggregate counts and redacted identifiers for diagnostics.
- Treat a secret shared outside its secret manager as compromised: rotate it,
  update the secret manager, and invalidate the old value.
- Use least privilege and read-only inspection first. Ask before running data
  migrations, changing RLS, restarting production services, or sending WhatsApp
  messages.

## Development workflow

1. Inspect `git status` before editing; preserve unrelated user changes.
2. Update or add focused tests for changed business logic.
3. Run `npm test` and `npm run lint` for web changes.
4. Review the diff and do not stage unrelated files.
5. Record material architectural or operational decisions in
   `PROJECT_KNOWLEDGE.md`.

The bot currently lacks a real test suite. Changes to it require a manual
smoke-test plan and an explicit deployment/rollback plan.

## Supabase rules

- Use a connected Supabase MCP/OAuth session or approved CLI workflow; do not
  paste database credentials into commands.
- Verify production RLS, policies, functions, extensions, and Security Advisors
  before asserting the database is secure.
- Every exposed `public` table needs deliberate RLS and policies. Review broad
  `anon`/`authenticated` policies for ownership and abuse controls.
- Keep SQL migrations ordered and reviewable. Do not rely on a one-shot script
  as the only record of production schema state.

## Operational rules

- Production bot health: inspect PM2 status and redacted logs first. A restart
  count needs a root-cause note, not merely a restart.
- Maintain a documented rollback path for Vercel and the bot.
- Prefer a non-root, key-only SSH deployment user. Do not change SSH, firewall,
  Nginx, PM2, or cron settings without explicit authorization.

## Durable context

`PROJECT_KNOWLEDGE.md` is the human/agent project brief. Keep it factual and
dated. Store secrets only in the appropriate platform secret manager, never in
this repository.
