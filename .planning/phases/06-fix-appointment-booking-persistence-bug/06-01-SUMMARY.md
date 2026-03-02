---
phase: 06-fix-appointment-booking-persistence-bug
plan: 01
subsystem: api
tags: [typescript, sse, booking, types, flow-editor]

# Dependency graph
requires:
  - phase: 04-chat-sse-integration
    provides: SSEEventType union and AgentType used by chat pipeline
  - phase: 03-data-backend
    provides: appointment.service.ts with getAvailableSlots private function
provides:
  - booking_confirmed and booking_failed SSEEventType members
  - booking member in AgentType union
  - BookingConfirmedEvent and BookingFailedEvent interfaces
  - getAvailableSlots as named export from appointment.service.ts
  - booking node and edge in flow editor pipeline
affects: [06-02-fix-appointment-booking-persistence-bug]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named export of previously-private service functions enables standalone invocation"
    - "SSEEventType and AgentType union extensions follow existing member pattern"

key-files:
  created: []
  modified:
    - src/server/sse/emitter.ts
    - src/shared/types.ts
    - src/server/services/appointment.service.ts
    - src/server/routes/api/flow.get.ts

key-decisions:
  - "getAvailableSlots gets its own connectDB() call when exported standalone — bookAppointment already has its own connectDB() so the private call was always within that context"
  - "Booking node placed at x:560 y:500 (below tool-search at y:100) matching plan spec — tool type matches existing tool-search pattern"

patterns-established:
  - "Service functions that escape their parent object context must independently call connectDB()"

requirements-completed: [BOOK-01, BOOK-02, BOOK-04]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 06 Plan 01: Fix Appointment Booking Persistence Bug — Type Contracts Summary

**SSE booking event types, AgentType extension, exported getAvailableSlots(), and booking flow node established as shared contracts for Plan 02 implementation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-01T20:43:00Z
- **Completed:** 2026-03-01T20:48:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended SSEEventType with `booking_confirmed` and `booking_failed` — Plan 02 can now emit these without TypeScript errors
- Extended AgentType with `booking` and updated SSEEvent interface — booking node can be highlighted in the flow editor
- Added BookingConfirmedEvent and BookingFailedEvent interfaces to types.ts — typed payloads for SSE consumers
- Exported `getAvailableSlots()` as a named export with its own `connectDB()` call — callable from chat.post.ts directly
- Added `booking` tool node and `edge-schedule-booking` edge to the flow pipeline — booking step is now visible in the flow editor

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend type contracts for booking events and node** - `af9d62b` (feat)
2. **Task 2: Export getAvailableSlots and add booking node to flow pipeline** - `eaf32ef` (feat)

## Files Created/Modified
- `src/server/sse/emitter.ts` - Added `booking_confirmed` and `booking_failed` to SSEEventType union
- `src/shared/types.ts` - Added `booking` to AgentType, updated SSEEvent.event, added BookingConfirmedEvent and BookingFailedEvent interfaces
- `src/server/services/appointment.service.ts` - Exported getAvailableSlots as named export with connectDB() call
- `src/server/routes/api/flow.get.ts` - Added booking tool node and edge from specialist-schedule to booking

## Decisions Made
- `getAvailableSlots` gets its own `connectDB()` call: when exported standalone (called directly from chat.post.ts), it runs outside the `bookAppointment` context that previously held the only `connectDB()` call.
- Booking node uses type `'tool'` (not a new type) matching the existing `tool-search` node pattern — no new FlowNode type needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript's default `npx tsc --noEmit` showed 2 pre-existing errors (spec output files not built) — unrelated to this plan's changes. Used `--project tsconfig.app.json` for accurate verification. Both task TypeScript checks passed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All type contracts are established — Plan 02 can import `getAvailableSlots`, emit `booking_confirmed`/`booking_failed` SSE events, and reference `'booking'` AgentType without any TypeScript errors
- Flow editor pipeline now shows the booking node connected from schedule specialist

---
*Phase: 06-fix-appointment-booking-persistence-bug*
*Completed: 2026-03-01*
