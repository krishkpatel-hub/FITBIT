# Phase 1: Authenticated Product Structure

Status: Phase 1 implementation verified and prepared for the dedicated navigation commit. No deployment performed.

This phase changes frontend navigation, presentation, and workflow organization only. Existing uncommitted work from the previous cleanup was preserved. No additional backend application, authentication, schema, API, programming-formula, Coach-agent, or realtime changes were made in this phase.

## Old Information Architecture

Dashboard / Strength Program / Templates / Log Workout (Progress) / Calendar / Analytics / Coach / Profile / Logout.

Workout logging and results shared one destination; Templates opened directly into an editor; Profile duplicated training summaries; Home repeated program configuration and a feature directory.

## New Information Architecture

| Primary navigation | Purpose | Secondary navigation |
| --- | --- | --- |
| Home | Decide what to do next | Onboarding or current week and next workout |
| Program | Plan training | Program, Calendar |
| Train | Perform a workout | Start Workout, Templates |
| Progress | Review results | History, PRs, Body Metrics, Analytics |
| Coach | Ask about training | Existing Coach experience |

Profile and Logout are under the account/avatar disclosure. No Settings destination was invented. Desktop navigation becomes a collapsible menu below 1024px. Secondary navigation uses links with active states and wraps on narrow screens.

## Home and Duplicate UI Removed

- New users see Set your strength, Generate your program, Start training, with a CTA into the existing Program setup.
- Returning users see their generated week, next planned session, Continue Program, and optional recent completed session.
- Home reads existing program-week data rather than treating a custom workout as proof of a generated program.
- Strength entry and generation now have one UI home in Program; their existing implementations are unchanged.
- Removed Home's repeated feature directory and Profile's duplicate Strength Summary and its unnecessary requests.
- Progress defaults to History instead of adding another analytics overview.
- The development-only demo helper remains available in a collapsed Home disclosure.

## Templates UX

1. Choose Push Day, Pull Day, Leg Day, Upper Body, Lower Body, or Create from scratch.
2. Details: name, category, optional description.
3. Exercises: compact rows with edit/remove and an Add Exercise action. Only the selected exercise editor is expanded.
4. Review: save the template, or Save & Start Workout.

The existing exercise-only normalization and workout-draft mapping were extracted into a typed utility. No migration runs and merely opening a legacy template does not modify it. New drafts contain independently copied exercises with empty sets. Sets, reps, weights, and plus sets are entered in Train and use the existing workout save API.

Saved templates have Start Workout as their primary action, Edit as secondary, and Delete inside a keyboard-accessible overflow disclosure with confirmation. Existing backend-provided default templates remain selectable without editing the default record.

## Routes Changed and Redirects Added

| Old URL | New destination |
| --- | --- |
| `/dashboard` | `/app` |
| `/strength-program` | `/app/program` |
| `/calendar` | `/app/program/calendar` |
| `/templates` | `/app/train/templates` |
| `/progress` or `/progress?section=log-workout` | `/app/train` |
| `/progress?section=training-history` | `/app/progress/history` |
| `/progress?section=log-pr` or `/prs` | `/app/progress/prs` |
| `/progress?section=body-metrics` | `/app/progress/body` |
| `/progress?section=strength-progress` or `/analytics` | `/app/progress/analytics` |
| `/coach` | `/app/coach` |
| `/profile` | `/app/profile` |

`/app/progress` redirects to History. Compatibility redirects replace history entries and preserve navigation state, hashes, and unrelated query parameters. Public URLs, login/register behavior, BrowserRouter, and the existing Vercel SPA rewrite remain unchanged.

The existing Progress component continues to implement its forms to avoid unnecessary file restructuring. Route-selected views separate those forms into Train and Progress. A history edit carries the existing workout ID into Train; saving still updates that record. A planned session can be opened from Home or Program without creating a duplicate.

## Accessibility and Responsive Fixes

- Semantic primary, mobile, secondary, and account navigation; active links expose `aria-current`.
- Account disclosure exposes expanded state, closes on outside click or Escape, and returns focus on Escape.
- Template steps move focus to the new heading and expose the current step; errors and successful saves use live status semantics.
- Destructive template actions are separated from Start Workout.
- Calendar grid cells no longer force horizontal page overflow at 390px/430px. Compact mobile status labels retain full accessible descriptions.
- Calendar date labels now format the stored UTC day, consistent with the selected calendar key and workout History; no stored dates or date calculations were changed.
- Profile remains an account form; its existing measurement conversion and save behavior are preserved.

## Files Changed in This Phase

Created:
- `frontend/src/layouts/AppSectionLayout.jsx`: shared secondary navigation.
- `frontend/src/utils/templateWorkflow.ts`: existing starter data and independent exercise-only draft mapping.
- `backend/test/productNavigation.test.js`: frontend utility regressions, run by the existing repository test command.
- `PHASE_1_UX_REVIEW.md`: this review and verification record.

Modified:
- `frontend/src/utils/navigation.ts`: primary destinations, secondary destinations, compatibility mapping.
- `frontend/src/App.jsx`: authenticated route groups and legacy redirects.
- `frontend/src/components/Navbar/Navbar.jsx`: five-item primary navigation, account disclosure, mobile menu.
- `frontend/src/components/Sidebar/Sidebar.jsx`: correct exact Home matching with shared navigation.
- `frontend/src/layouts/MainLayout.jsx`: retain the Home container width at its new URL.
- `frontend/src/pages/Dashboard/Dashboard.jsx`: task-focused Home, onboarding links, current program and next session.
- `frontend/src/pages/Templates/Templates.jsx`: starter selection, three-step editor, saved-template actions.
- `frontend/src/pages/Progress/Progress.jsx`: route-selected Train/results views and draft/edit/session handoff.
- `frontend/src/pages/Profile/Profile.jsx`: remove duplicate training summary, retain profile form.
- `frontend/src/pages/StrengthProgram/StrengthProgram.jsx`: canonical Calendar link and Open in Train link only in this phase.
- `frontend/src/pages/Coach/Coach.jsx`: canonical Analytics link only in this phase.
- `frontend/src/components/Calendar/Calendar.jsx`: narrow-screen containment and accessible status labels.
- `frontend/src/pages/Calendar/Calendar.jsx`: containing grid, actionable empty state, UTC date-label presentation.

Other dirty files belong to the prior cleanup and were not reverted or expanded as part of this phase.

## Test Results

- `npm run lint`: passed (the repository's custom lint/security scan).
- `npm run typecheck`: passed, frontend and backend.
- `npm test`: 44 passed, 0 failed, including four new navigation/template regression tests and existing Coach/realtime/service tests.
- The sandbox initially prevented loopback test servers from listening; rerunning with local-listen permission passed. No security threshold or test assertion was weakened.
- Browser verification used Vite with an isolated in-memory API on localhost. No production user, MongoDB data, or paid provider calls were used.
- New-user journey: Login -> Home -> strength setup -> save maxes -> generate four-day week -> Open in Train -> enter reps -> save -> Progress History -> Coach with a fixture-streamed response.
- Custom journey: Train -> Templates -> Push Day -> customize -> Save & Start Workout -> add sets -> save -> History. Changing the workout exercise did not change the source template.
- All five starter templates saved; none exposed numeric prescription inputs. Scratch creation, validation, editing an existing template, and starting it again passed.
- History edits retained the existing session instead of adding another. Profile measurements saved and survived refresh in the fixture.
- Returning login -> Home -> Continue Program passed.
- All 11 authenticated views rendered at 1440, 1280, 1024, 768, 430, and 390px without horizontal page overflow after the Calendar containment fix.
- All legacy destinations were checked through direct navigation. Nested Program, Templates, History, and Profile routes survived local refresh.
- All 11 authenticated views redirected to Login when signed out. Mobile menu, Account/Profile/Logout, and Escape dismissal passed.
- Browser error/warning log was empty in the final checked session.

## Build Result and Scope Limits

`npm run build` passed: frontend production bundle generated; backend typecheck and syntax verification passed for 56 source files. Analytics and Coach remain lazy-loaded; no dependencies were added.

The existing Vercel rewrite covers the new `/app/...` URLs. Production deployment has not been performed or verified. Live OpenAI/provider behavior and production database writes were not retested for this frontend-only phase.

## Final Navigation Verification

Validation was rerun against the current repository: lint, frontend/backend typecheck, all 44 tests, and both builds passed. A fresh local browser pass checked all 11 authenticated views at 1440px, 768px, and 390px, legacy redirects, nested-route refresh, active navigation attributes, mobile navigation, and Escape focus restoration. No browser warnings or errors were observed.

The dedicated navigation commit excludes the earlier backend, login, Coach transport/agent, and Strength Program calculation/progression fixes. Those existing uncommitted changes are retained in the working tree. Only navigation links are staged from the mixed Coach and Strength Program files.

The exact staged snapshot was also exported to an isolated temporary directory and checked independently: lint, frontend/backend typecheck, all 32 tests present in that snapshot, frontend production build, and backend syntax/build passed. The current working tree has 12 additional tests from the earlier uncommitted cleanup; all 44 pass there. No production API, database, or provider access was used for navigation verification.
