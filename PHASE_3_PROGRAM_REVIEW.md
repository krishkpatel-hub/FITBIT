# Phase 3: Program Workflow

## Scope

Program presentation only, continuing from the current working tree. Phase 1 navigation and Phase 2 Home remain unchanged. No runtime backend files, services, routes, API payloads, authentication, realtime behavior, or database schemas were changed in this phase.

The Program page's existing state, calculations, effects, API calls, and request handlers were compared against a pre-edit copy and remain byte-for-byte identical. Earlier uncommitted fixes within this page are retained in this commit; unrelated existing local changes are excluded.

## Training Max UX

- One Training Maxes section displays the selected week's 1RM and Training Max for all four lifts.
- One Edit Maxes action opens the same area for editing, with the existing calculated TM preview, Save, and Cancel behavior.
- Four columns at desktop widths, two at tablet widths, and a single column on narrow screens. Inputs and unit labels remain readable.
- Historical weeks use their existing saved max snapshots and stay view only.

## Week and Day Navigation

- Compact week buttons replace tall status blocks. Current/completed/locked states and the fourth week's deload label use existing state logic.
- Locked weeks cannot select or load workouts. They remain keyboard-focusable with `aria-disabled` so their contextual explanation is available on focus as well as hover.
- Generation stays near the selected week, disabled until the existing max-entry requirements are satisfied.
- Training days are compact labeled controls in the existing Bench, Deadlift, Squat, Overhead Press order. Selection uses `aria-current` and a restrained border/surface change; completed days receive a text label.
- Calendar remains a secondary Program link. Open in Train still passes the selected planned workout through the existing navigation state.

## Set Tracking and Progression

- The selected workout occupies the full content width instead of sharing a narrow nested panel with a vertical day rail.
- Set, Weight, Reps, Type, and Done remain visible at every tested width. Plus sets retain their prescribed `+` reps and receive a small outlined label.
- Semantic row/column headers, a table caption, explicit checkbox labels, and 44px checkbox hit areas improve readability and keyboard use.
- Existing set-save guards, completion behavior, and per-lift progression binding are retained.
- Current TM, plus-set reps, training note, and Apply Progression sit directly below the workout.
- Next TM and Increase appear only after a successful API response, with the recorded reps, previous TM, and existing recommendation. No projected results or new calculations are introduced.

## History

- Program History stays below the active workflow, collapsed on initial load.
- The existing one-row-per-week snapshots are unchanged. On small screens, only the expanded history table scrolls horizontally, within a labeled keyboard-focusable region.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: frontend and backend passed.
- `npm test`: 56 passed, 0 failed in the current working tree.
- `npm run build`: frontend production build and backend typecheck/syntax build passed.
- The exact staged snapshot was also validated independently of unrelated local changes: lint, frontend/backend typecheck, all 44 tests in that snapshot, and both builds passed.
- Four new deterministic tests cover TM rounding, all four weekly prescriptions including deload, per-lift weights, fresh-week completion state, unchanged prior workouts, estimated volume, and existing plus-set thresholds.
- Browser checks used an isolated synthetic REST fixture that reuses the existing adaptive calculation service. No production accounts, MongoDB, or OpenAI were accessed.
- At 1440, 1280, 1024, 768, 430, and 390px: document width matched viewport width; the set Type column remained visible; training-day controls retained at least 44px height; max columns adapted as intended.
- Verified inline editing/preview/save, keyboard locked-week explanation and selection guard, all four day views, set completion, selected-lift-only progression results, last-day progression after completion, fresh Week 2 entry/generation, read-only previous weeks, reload persistence through the fixture, collapsed/expanded history, Calendar navigation, and Open in Train selecting the intended workout.
- Verified the no-program setup state, disabled generation before maxes are saved, and no browser console errors during these flows.

Live database persistence and deployed behavior were not retested for this presentation-only phase. The local fixture checks UI integration, not production database idempotency or authorization.

## Files

- `frontend/src/pages/StrengthProgram/StrengthProgram.jsx`: scoped Program presentation and accessibility changes; existing handlers retained.
- `backend/test/strengthProgramContract.test.js`: regression coverage for the unchanged values consumed by the Program UI.
- `PHASE_3_PROGRAM_REVIEW.md`: scope and validation record.
