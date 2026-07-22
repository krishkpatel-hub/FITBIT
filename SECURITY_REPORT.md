# Security Report

Date: 2026-07-22

Scope: full repository audit for GetJackedCoach / FitBit-Strength before production deployment.

## Summary

The current source tree no longer contains tracked `.env` files or hardcoded production secrets. The backend now includes security headers, response compression, stricter CORS handling, request body limits, NoSQL sanitization, auth rate limiting, configurable JWT expiration, and production-safe 500 error responses.

Dependency audits now report zero known vulnerabilities for both frontend and backend.

## Issues Found And Fixes Applied

| Issue | Severity | Fix Applied |
| --- | --- | --- |
| Real MongoDB URI and JWT secret were found in old Git history commits (`74f856a`, `385809c`) inside `README.md`. | Critical | Current tracked files contain placeholders only. Added this report with rotation/history cleanup guidance. History rewrite was not performed automatically because it requires coordination and force-push. |
| Backend was missing common HTTP security headers. | High | Added `helmet` middleware in `backend/src/app.js`. |
| Login/register endpoints had no rate limiting. | High | Added `express-rate-limit` and applied separate limiters to `/api/auth/login` and `/api/auth/register`. |
| No request sanitization layer existed for Mongo operator injection payloads. | High | Added `express-mongo-sanitize` middleware and enabled `mongoose.set('sanitizeFilter', true)`. |
| Backend accepted default JSON/urlencoded body sizes. | Medium | Added `100kb` request body limits. |
| Server errors returned raw error messages in production. | Medium | Updated centralized error middleware so production 500 responses return `Internal server error`. |
| CORS accepted only one string and did not explicitly reject unapproved origins. | Medium | Updated CORS to use an allowlist from comma-separated `CLIENT_URL` values. No wildcard origins are used. |
| JWT expiration was hardcoded. | Medium | Added `JWT_EXPIRES_IN` environment support with `30d` default. |
| Missing required environment variable checks. | Medium | Added runtime checks for `MONGO_URI` and `JWT_SECRET`. |
| Demo seed routes were mounted even in production, although controller blocked execution. | Medium | Updated app routing so demo routes are not mounted in production. |
| `.gitignore` did not cover several common generated/sensitive files. | Low | Added `.env.*`, `.vercel`, `coverage`, logs, `.vscode`, and `.idea`, while allowing `.env.example`. |
| No safe environment templates existed. | Low | Added `backend/.env.example` and `frontend/.env.example` with placeholder values only. |
| Backend dependency audit reported one low-severity `body-parser` advisory. | Low | Ran `npm audit fix`; backend audit now reports zero vulnerabilities. |

## Validation Results

- Current tracked `.env` files: none.
- Current source secret scan: no MongoDB URI, JWT secret, API key, OAuth secret, SMTP credential, Render token, or Vercel token found in tracked source. Placeholder env examples remain intentionally.
- Git history secret scan: old MongoDB URI and JWT secret were found in prior commits.
- Backend app import: passed.
- Frontend production build: passed.
- Backend `npm audit --audit-level=high`: zero vulnerabilities.
- Frontend `npm audit --audit-level=high`: zero vulnerabilities.

## Authentication Review

- Passwords are hashed with `bcryptjs` in the `User` model.
- Password field uses `select: false`.
- Login errors return a generic `Invalid credentials` message.
- JWTs are verified by protected route middleware.
- Expired and invalid JWTs are rejected by `jwt.verify`.
- JWT secret is read from `process.env.JWT_SECRET`.
- JWT expiration is now configurable via `JWT_EXPIRES_IN`.
- Refresh token logic is not implemented.
- Cookie auth is not currently used, so Secure/HttpOnly/SameSite cookie flags are not applicable.

## Authorization And Data Isolation

- Protected routes use `protect` middleware.
- User-owned resources are queried with `user: req.user.id`.
- Shared/default workout templates are explicitly allowed only through template access helpers.
- Controllers use field allowlists before create/update operations, reducing mass assignment risk.

## Remaining Recommendations

1. Rotate the exposed MongoDB Atlas password immediately.
2. Rotate `JWT_SECRET` immediately.
3. Invalidate existing JWT sessions after rotating `JWT_SECRET`.
4. Remove exposed secrets from Git history using BFG Repo-Cleaner or `git filter-repo`, then coordinate a force-push with any collaborators.
5. Treat the old database password as compromised even though current files no longer contain it.
6. Consider moving JWT storage from `localStorage` to short-lived access tokens plus Secure, HttpOnly, SameSite cookies for a stronger production auth posture.
7. Add schema-level request validation with a library such as Zod or Joi for every write endpoint.
8. Add automated security checks in CI: `npm audit --audit-level=high`, secret scanning, and dependency review.
9. Add a password reset flow only with rate limiting, short-lived one-time tokens, and no user enumeration.
10. Configure production `CLIENT_URL` explicitly to the deployed frontend origin.
11. Keep MongoDB Atlas IP/network access restrictive where possible.

## Files Changed During This Audit

- `.gitignore`
- `backend/.env.example`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/app.js`
- `backend/src/config/db.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/middleware/errorMiddleware.js`
- `backend/src/middleware/rateLimitMiddleware.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/utils/generateToken.js`
- `frontend/.env.example`
- `SECURITY_REPORT.md`
