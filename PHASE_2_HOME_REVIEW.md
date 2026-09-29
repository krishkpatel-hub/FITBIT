# Phase 2: Home Training Experience

## Scope

Home only (`/app`, with the existing `/dashboard` redirect). Phase 1 routes, navigation, shared styles, and other pages are unchanged. No backend application code, APIs, schemas, authentication, Coach behavior, realtime transport, or strength/progression calculations were modified.

Home still reads the existing dashboard and program-week endpoints. Its existing realtime subscriptions and development-only demo helper remain intact. Earlier unrelated uncommitted fixes are preserved and excluded from this commit.

## New User Flow

- No program: a clear explanation and Set Up Program action.
- Partial setup: a distinct lift count, such as `2 / 4 lifts configured`, and Continue Setup.
- All four lifts saved: `4 / 4 lifts configured`, Set your strength marked Complete, Generate your program marked Current step, and Generate Program as the primary action.
- Three numbered steps explain Set your strength, Generate your program, and Start training. All setup actions lead into the existing Program page; no duplicate max-entry form or generation control is implemented on Home.
- Once the program is generated, the next session becomes the primary content. Custom-template access remains a quiet secondary link while onboarding.

## Returning User Flow

- Week, next workout title, actual exercise count, and main lift are presented before secondary information.
- Continue Program is the single primary action. Calendar and strength-number updates are secondary text links.
- Recent activity shows the last completed workout, or the generated week if there is no completed session yet. History stays a link, not another dashboard.
- A completed week explains whether updated maxes are needed or already saved. A completed fourth week offers Review Program, without inventing a fifth week or a restart operation.
- If no planned session remains in an incomplete week, Home asks the user to review Program. It does not consider skipped sessions completed or substitute an unrelated custom/future workout.

## Duplicate Content Removed

- Removed the competing Start Workout action beside Continue Program; workout logging remains available in Train and Program.
- Removed repeated week information in the workout title and the secondary completed-day counter.
- No charts, PR summaries, body metrics, Coach insights, recommendations, training-max tiles, or program tables were added. Those remain in their dedicated Phase 1 destinations.
- Open sections, typography, whitespace, and dividers replace any need for additional Home cards. Global design and navigation are unchanged.
- Home's small secondary labels use a darker neutral with approximately 4.9:1 contrast on the existing page background. Primary actions have a 44px minimum height; the current setup step exposes `aria-current`, loading exposes a status, and errors expose an alert.

## Files Changed

- `frontend/src/pages/Dashboard/Dashboard.jsx`: Home presentation, setup states, workout metadata, recent activity, safe error/retry and restrained loading presentation.
- `frontend/src/utils/homeTraining.ts`: typed, read-only Home display helpers; no persistence or progression calculations.
- `backend/test/homeTraining.test.js`: eight frontend-helper regressions using the repository's existing Node test runner.
- `PHASE_2_HOME_REVIEW.md`: scope and verification record.

## Validation

- Repository lint and frontend/backend typecheck passed.
- Home and Phase 1 navigation/template regressions: 12 passed.
- Full current working-tree suite: 52 passed, 0 failed.
- Frontend production build passed.
- Local browser verification used an isolated synthetic API, not production users, MongoDB, or OpenAI.
- New, partial, ready-to-generate, and returning-user states were checked at 1440px, 1024px, 768px, and 390px. No horizontal page overflow was found.
- Completed-week, next-week-maxes-ready, final-block, skipped-session, delayed-response, and failed-response states were checked. Technical error details were not displayed.
- Continue Program, View Calendar, and View History reached their existing Phase 1 destinations.
- The exact staged commit was independently validated without the earlier unrelated local fixes: lint, typecheck, all 40 tests in that snapshot, and the frontend production build passed.

Production deployment and live database behavior were not retested for this frontend-only change.
