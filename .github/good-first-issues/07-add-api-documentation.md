---
title: "[Good First Issue] Generate API documentation from route handlers"
labels: ["good-first-issue", "docs", "api"]
assignees: ""
---

## Description
Create OpenAPI/Swagger documentation for all API routes in `src/app/api/` using JSDoc comments and a doc generator.

## Acceptance Criteria
- [ ] Add JSDoc comments to all API route handlers (GET, POST, PUT, DELETE)
- [ ] Include: description, parameters, request body, responses (200, 400, 401, 404, 500)
- [ ] Use `@openapi` or `@swagger` tags compatible with `swagger-jsdoc`
- [ ] Generate `openapi.json` at build time
- [ ] Serve Swagger UI at `/api/docs` (dev only)
- [ ] Document at least 20 endpoints

## Files to Create
- `src/lib/openapi.ts` — configuration for swagger-jsdoc
- `src/app/api/docs/route.ts` — serves Swagger UI

## Files to Modify
- All files in `src/app/api/**/route.js` — add JSDoc comments

## Example JSDoc
```javascript
/**
 * @openapi
 * /api/listings:
 *   post:
 *     summary: Create a new listing
 *     tags: [Listings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateListingRequest'
 *     responses:
 *       '201':
 *         description: Listing created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListingResponse'
 *       '400':
 *         description: Validation error
 *       '401':
 *         description: Unauthorized
 *       '422':
 *         description: Moderation rejected
 */
export async function POST(req) { ... }
```

## Estimated Effort
**L** (8-12 hours) — can be split across multiple contributors

## Verification
```bash
npm run dev
# Visit /api/docs
# Verify all endpoints documented
npm run build
# openapi.json generated
```