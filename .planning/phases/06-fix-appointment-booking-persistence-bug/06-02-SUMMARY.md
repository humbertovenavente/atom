---
phase: 06-fix-appointment-booking-persistence-bug
plan: 02
subsystem: api
tags: [sse, booking, appointment, chat, mongodb, specialist-prompt]

# Dependency graph
requires:
  - phase: 06-01
    provides: "SSEEventType extended with booking_confirmed/booking_failed, AgentType extended with booking, getAvailableSlots exported from appointment.service.ts, booking node in flow pipeline"
provides:
  - "Fields-first booking guard: fires whenever fullName+preferredDate+preferredTime all present, regardless of LLM intent classification"
  - "Real available slots from MongoDB injected into specialist prompt via proactive getAvailableSlots() query"
  - "SSE events booking_confirmed and booking_failed emitted for frontend visibility"
  - "effectiveIntent overrides to 'schedule' when fields-first booking triggers"
  - "Failed booking clears conflicting field (preferredTime on slot_already_booked, preferredDate on day_fully_booked) for retry"
  - "Booking node lights up in flow editor during DB booking attempts"
affects: [frontend-chat, sse-pipeline, appointment-service]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fields-first booking guard: check data presence, not intent label"
    - "effectiveIntent override: derive intent from validated data when data is authoritative"
    - "Proactive slot injection: fetch real DB slots before calling LLM so specialist never invents times"
    - "Retry-on-failure: clear conflicting field so next user message re-triggers booking attempt"

key-files:
  created: []
  modified:
    - src/server/routes/api/chat.post.ts

key-decisions:
  - "Fields-first booking: guard on hasAllBookingFields (fullName+preferredDate+preferredTime) not on intent==='schedule' — eliminates silent booking failures when LLM reclassifies final user message"
  - "effectiveIntent overrides raw classified intent when isBookingContext is true — ensures specialist prompt, re-validation, and memory all use the corrected intent"
  - "Proactive getAvailableSlots() call before building specialist prompt — slots injected via new availableSlots param on buildSpecialistPrompt, preventing LLM from inventing fake schedules"
  - "When no date known: specialist prompt says 'Primero pide la fecha'; when slots empty after date known: 'No hay horarios disponibles para esa fecha'"

patterns-established:
  - "Fields-first guard pattern: data presence beats intent label for transactional operations"
  - "effectiveIntent pattern: compute effective intent from merged data, pass to all downstream consumers (specialist, re-validation, memory)"

requirements-completed: [BOOK-01, BOOK-03, BOOK-05]

# Metrics
duration: ~15min
completed: 2026-03-01
---

# Phase 06 Plan 02: Fix Appointment Booking Persistence Bug Summary

**Fields-first booking guard and real DB slot injection in chat.post.ts — appointments now persist regardless of LLM intent reclassification, and the specialist LLM only shows actual available times from MongoDB.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-01T23:15:00Z
- **Completed:** 2026-03-01T23:31:11Z
- **Tasks:** 2 (1 auto + 1 checkpoint, checkpoint approved by user)
- **Files modified:** 1

## Accomplishments
- Replaced intent-dependent booking guard with fields-first approach — booking fires when fullName+preferredDate+preferredTime are all present, regardless of how the LLM classifies the user's final message
- Added proactive `getAvailableSlots()` call before building specialist prompt, injecting real MongoDB slot data and adding "NUNCA inventes horarios" instruction to prevent LLM from fabricating times
- `effectiveIntent` computed from validated data and used consistently for specialist node selection, re-validation, and memory persistence
- All 4 human verification tests passed: booking fires despite intent reclassification, real availability shown, booking node lights up in flow editor, failed booking clears conflicting field for retry

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement fields-first booking guard and proactive slot injection in chat.post.ts** - `1eeb4a2` (fix)
2. **Task 2: Checkpoint - Verify booking persistence and real availability** - Human-approved, no code commit needed

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `src/server/routes/api/chat.post.ts` - Fields-first booking guard (hasAllBookingFields), effectiveIntent override, proactive getAvailableSlots() call, booking SSE events, buildSpecialistPrompt with availableSlots param, effectiveIntent in memoryService.save

## Decisions Made
- Fields-first booking: check data presence (fullName+preferredDate+preferredTime), not `intent === 'schedule'` — eliminates silent booking failures when LLM reclassifies the user's final message as 'generic'
- effectiveIntent overrides raw classified intent when all booking fields present — ensures specialist prompt, re-validation, and memory all operate with the corrected scheduling intent
- Proactive getAvailableSlots() fetched before LLM call and injected via new `availableSlots?` param on buildSpecialistPrompt — prevents specialist LLM from inventing fake times
- When preferredDate not yet known: specialist prompt says "Primero pide la fecha al cliente" (no specific times shown); when date known but no slots: "No hay horarios disponibles para esa fecha"

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — TypeScript compiled with zero errors after all 6 changes were applied.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 is complete: both plans (type contracts in 06-01, core booking fix in 06-02) are done
- The appointment booking flow is now end-to-end reliable: fields-first guard, real slot data, proper SSE events, retry-on-failure
- No blockers for any subsequent work

## Self-Check: PASSED

- FOUND: `.planning/phases/06-fix-appointment-booking-persistence-bug/06-02-SUMMARY.md`
- FOUND: commit `1eeb4a2` (fix(06-02): fields-first booking guard and real slot injection in chat.post.ts)

---
*Phase: 06-fix-appointment-booking-persistence-bug*
*Completed: 2026-03-01*
