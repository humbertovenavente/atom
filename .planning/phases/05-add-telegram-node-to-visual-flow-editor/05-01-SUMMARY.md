---
phase: 05-add-telegram-node-to-visual-flow-editor
plan: "01"
subsystem: data-model
tags: [telegram, types, mongoose, schema]
dependency_graph:
  requires: []
  provides: [telegram-type-union, botToken-schema, source-schema, save-source-param]
  affects: [05-02, 05-03, 05-04]
tech_stack:
  added: []
  patterns: [$setOnInsert for immutable-on-creation fields]
key_files:
  created: []
  modified:
    - src/shared/types.ts
    - src/server/models/flow.ts
    - src/server/models/conversation.ts
    - src/server/memory/memory.service.ts
decisions:
  - "$setOnInsert chosen over $set for source field — ensures channel type is immutable after first write"
  - "botToken declared in Mongoose nodeConfigSchema — required to bypass strict mode silent strip on save"
metrics:
  duration: "5 min"
  completed: "2026-03-01"
  tasks_completed: 3
  files_modified: 4
---

# Phase 5 Plan 1: Telegram Data Model Foundations Summary

**One-liner:** TypeScript union + Mongoose schema extensions adding 'telegram' type, botToken field, conversation source enum, and $setOnInsert-based save() source param.

## What Was Built

Four coordinated low-level changes establishing the data contract for the Telegram node:

1. **src/shared/types.ts** — `FlowNode['type']` union extended with `'telegram'`; `NodeConfig` interface gains optional `botToken?: string` field.

2. **src/server/models/flow.ts** — `nodeConfigSchema` gains `botToken: { type: String, default: '' }` — without this, Mongoose strict mode would silently strip botToken on every flow save.

3. **src/server/models/conversation.ts** — `conversationSchema` gains `source: { type: String, enum: ['web', 'telegram'], default: 'web' }` — tracks which channel originated the conversation.

4. **src/server/memory/memory.service.ts** — `save()` `update` param extended with `source?: 'web' | 'telegram'`; source is written via `$setOnInsert` so it is set only when the conversation document is first created and never overwritten on subsequent saves.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend FlowNode type union and NodeConfig with telegram | 35d0472 |
| 2 | Add botToken to nodeConfigSchema, source to conversationSchema | 6d92cbb |
| 3 | Add source param to memoryService.save() using $setOnInsert | e8b01a0 |

## Verification

- `grep telegram src/shared/types.ts` — PASS (line 94)
- `grep botToken src/shared/types.ts` — PASS (line 117)
- `grep botToken src/server/models/flow.ts` — PASS (line 6)
- `grep source src/server/models/conversation.ts` — PASS (line 16)
- `grep source src/server/memory/memory.service.ts` — PASS (line 34)
- `grep setOnInsert src/server/memory/memory.service.ts` — PASS (line 53)
- `npx tsc --noEmit --skipLibCheck` — No errors in changed files (2 pre-existing unrelated test-spec cache errors)

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Checklist

- [x] `src/shared/types.ts` exports FlowNode with `'telegram'` in the type union and NodeConfig with `botToken?: string`
- [x] `src/server/models/flow.ts` nodeConfigSchema includes `botToken: { type: String, default: '' }`
- [x] `src/server/models/conversation.ts` conversationSchema includes `source: { type: String, enum: ['web', 'telegram'], default: 'web' }`
- [x] `src/server/memory/memory.service.ts` save() accepts `source?: 'web' | 'telegram'` and uses `$setOnInsert` to write it only on document creation
- [x] TypeScript compilation reports no new errors in changed files

## Self-Check: PASSED

All modified files exist and contain the required changes. All commits exist in git history.
