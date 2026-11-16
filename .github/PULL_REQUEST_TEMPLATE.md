## Description

<!-- Link the issue this PR addresses -->
Fixes #<!-- issue number -->

<!-- Briefly describe what this PR does -->
This PR ...

## Type of Change

<!-- Check all that apply -->
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Documentation update
- [ ] Refactor (no behavior change)
- [ ] Performance improvement
- [ ] Test addition / improvement
- [ ] CI/CD / Build / Dependencies
- [ ] Security fix

## Component(s) Affected

<!-- Check all that apply -->
- [ ] Web: Listing creation (jual)
- [ ] Web: Marketplace / browsing
- [ ] Web: Dashboard / seller profile
- [ ] Web: Admin panel
- [ ] Web: Chat / messaging
- [ ] API: Listings CRUD
- [ ] API: Payments / QRIS
- [ ] API: Auth / Sessions
- [ ] API: Moderation / AI
- [ ] Bot: WhatsApp commands
- [ ] Bot: Broadcast / Notifications
- [ ] Bot: Realtime sync
- [ ] Database: Migrations / RLS
- [ ] Config: Campus / Multi-campus
- [ ] Infrastructure: Vercel / VPS / Supabase
- [ ] Documentation
- [ ] Tests

## Changes Made

<!-- List the key changes in this PR -->
- 
- 
- 

## Screenshots / Recordings

<!-- Add screenshots for UI changes, or terminal output for CLI/API -->
| Before | After |
|--------|-------|
|        |       |

## Testing

<!-- Describe how you tested this -->
- [ ] All existing tests pass (`npm run test`)
- [ ] New tests added for changes
- [ ] Manual testing done:
  - [ ] Local dev (`npm run dev`)
  - [ ] Production build (`npm run build`)
  - [ ] Affected user flows verified

## Checklist

<!-- Ensure all items are checked before requesting review -->
- [ ] My code follows the project's coding standards (ESLint, Prettier, TypeScript strict)
- [ ] I have run `npm run lint` and `npm run test` locally — all pass
- [ ] I have added/updated tests for new/changed logic
- [ ] I have updated documentation (README, CONTRIBUTING, docs/, code comments) if needed
- [ ] My commits follow Conventional Commits format
- [ ] PR title follows Conventional Commits format
- [ ] No secrets, tokens, or credentials in code or commits
- [ ] No console.log/debug statements left in production code
- [ ] Error handling follows project patterns (structured errors, proper logging)
- [ ] Database changes include migration (if applicable)
- [ ] Campus config changes are in `src/config/campus.ts` (not hardcoded)

## Security Considerations

<!-- Required for changes touching auth, payments, admin, data access -->
- [ ] Does not expose Service Role key to client
- [ ] Does not weaken RLS policies
- [ ] Does not bypass rate limiting
- [ ] Input validation present (Zod schemas)
- [ ] HMAC timing-safe comparison used for tokens
- [ ] File upload validation (magic bytes, size, type)

## Deployment Notes

<!-- Any special deployment steps? -->
- [ ] No special steps — standard deploy
- [ ] Requires new env vars (list in PR description)
- [ ] Requires Supabase migration (link migration file)
- [ ] Requires bot restart (VPS)
- [ ] Breaking change — coordinate with team

## Additional Context

<!-- Any other info, concerns, or discussion points -->