# Tasks: Remove Manual Toolbox Closing

**Input**: Design documents from `/specs/004-remove-manual-close/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Manual testing only (no automated test suite required per plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project verification and build preparation

- [X] T001 Verify project builds successfully with `npm run build`
- [X] T002 Verify current test configuration exists at workbench-config.test.json

**Checkpoint**: Project is buildable and ready for code changes

---

## Phase 2: User Story 1 - Simplified Toolbox Lifecycle (Priority: P1) 🎯 MVP

**Goal**: Remove manual close operations and implement automatic cleanup on server shutdown. Users can open toolboxes without needing to close them.

**Independent Test**: Open toolboxes and verify they work without requiring any close operation, and the system handles cleanup automatically on shutdown (SIGINT).

**Acceptance Criteria**:
1. Users can open toolboxes without calling close
2. System continues to function normally without resource leaks
3. Multiple toolboxes can be open simultaneously
4. All connections clean up automatically on server shutdown within 5 seconds

### Implementation for User Story 1

- [X] T003 [US1] Add idempotent check to `openToolbox()` method in src/client-manager.ts (early return if already open)
- [X] T004 [US1] Create `closeAllToolboxes()` method in src/client-manager.ts to iterate and close all open toolboxes
- [X] T005 [US1] Remove `close_toolbox` tool registration from `registerTools()` method in src/index.ts
- [X] T006 [US1] Update signal handlers (SIGINT/SIGTERM) in src/index.ts to call `clientManager.closeAllToolboxes()` before exit
- [X] T007 [US1] Remove tool list changed notification for close in src/index.ts (only needed for open now)

**Checkpoint**: At this point, toolboxes can be opened without manual close, and cleanup happens automatically on shutdown

---

## Phase 3: User Story 2 - Clean API Surface (Priority: P2)

**Goal**: Update documentation to reflect the simplified API that only includes list and open operations.

**Independent Test**: Review all documentation files and verify that only list_toolboxes and open_toolbox operations are documented, with no references to close_toolbox.

**Acceptance Criteria**:
1. README.md shows only 2 meta-tools (dynamic) or 3 (proxy)
2. CLAUDE.md architecture section reflects new lifecycle
3. Constitution Principle I updated with new meta-tool counts
4. No references to close_toolbox remain in any documentation

### Implementation for User Story 2

- [X] T008 [P] [US2] Update "The Workbench Meta-Tools" section in README.md (remove close_toolbox, update counts: 3→2 in dynamic, 4→3 in proxy)
- [X] T009 [P] [US2] Update "Tool Invocation Modes" section in README.md with new tool counts
- [X] T010 [P] [US2] Remove any usage examples showing close operations in README.md
- [X] T011 [P] [US2] Add note about automatic cleanup on server shutdown in README.md
- [X] T012 [P] [US2] Update workflow examples to remove close step in README.md
- [X] T013 [P] [US2] Update "The Workbench Meta-Tools" section in CLAUDE.md (remove close_toolbox documentation)
- [X] T014 [P] [US2] Update "Tool Registration and Invocation Patterns" section in CLAUDE.md
- [X] T015 [P] [US2] Update architecture overview with new lifecycle semantics in CLAUDE.md
- [X] T016 [US2] Update Principle I "Meta-Server Orchestration Pattern" in .specify/memory/constitution.md
- [X] T017 [US2] Change meta-tool counts in .specify/memory/constitution.md: "3 meta-tools" → "2 meta-tools" (dynamic), "4" → "3" (proxy)
- [X] T018 [US2] Update cleanup semantics in .specify/memory/constitution.md: "when toolboxes close" → "when server shuts down"
- [X] T019 [US2] Increment constitution version in .specify/memory/constitution.md (1.3.0 → 1.4.0 per MINOR change)
- [X] T020 [US2] Update Sync Impact Report at top of .specify/memory/constitution.md

**Checkpoint**: All documentation reflects the simplified API with no manual close operations

---

## Phase 4: Manual Testing & Validation

**Purpose**: Verify all acceptance criteria are met through manual testing

- [X] T021 Start workbench with test config: `WORKBENCH_CONFIG=./workbench-config.test.json npm start`
- [X] T022 Call `workbench_list_toolboxes` and verify it works
- [X] T023 Call `workbench_open_toolbox` with a test toolbox and verify it works
- [X] T024 Call `workbench_open_toolbox` again (same toolbox) and verify idempotent behavior (returns immediately with success)
- [X] T025 Try calling `workbench_close_toolbox` and verify tool-not-found error
- [X] T026 Send SIGINT (Ctrl+C) and verify graceful shutdown with cleanup within 5 seconds
- [X] T027 Verify no hanging processes remain after shutdown
- [X] T028 Test with multiple toolboxes open and verify all close on shutdown
- [X] T029 Verify no references to `workbench_close_toolbox` remain in README.md
- [X] T030 Verify no references to `workbench_close_toolbox` remain in CLAUDE.md
- [X] T031 Verify tool counts updated everywhere (search for "3 meta-tools", "4 meta-tools")
- [X] T032 Rebuild project with `npm run build` to verify no TypeScript errors

**Checkpoint**: All manual tests pass, documentation is clean, project builds successfully

---

## Phase 5: Release Preparation

**Purpose**: Prepare for release with version bump and changelog

- [X] T033 Update version in package.json from 0.7.3 to 0.8.0
- [X] T034 Add entry to CHANGELOG.md with breaking change notice
- [X] T035 Include migration guidance in CHANGELOG.md: "Remove all calls to workbench_close_toolbox - toolboxes now remain open until server shutdown"

**Checkpoint**: Release artifacts ready for merge and tag

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion
- **User Story 2 (Phase 3)**: Can start in parallel with User Story 1 (different files, no dependencies)
- **Manual Testing (Phase 4)**: Depends on User Story 1 completion (code changes must be done first)
- **Release Preparation (Phase 5)**: Depends on all previous phases completion

### User Story Dependencies

- **User Story 1 (P1)**: Code changes - MUST complete before manual testing
- **User Story 2 (P2)**: Documentation updates - Can proceed in parallel with US1

### Within Each User Story

**User Story 1 (Sequential)**:
1. T003: Idempotent open check (blocking for T006)
2. T004: closeAllToolboxes method (blocking for T006)
3. T005: Remove close_toolbox registration
4. T006: Update signal handlers (depends on T003, T004)
5. T007: Remove close notification

**User Story 2 (Parallel)**: All documentation tasks (T008-T015) can run in parallel except:
- T016-T020: Constitution updates must be sequential (same file)

### Parallel Opportunities

- **Phase 1**: Both tasks can run in parallel
- **Phase 2 + Phase 3**: User Story 1 and User Story 2 can proceed completely in parallel (different files)
- **Phase 3 (within)**: T008-T015 (README and CLAUDE.md updates) can all run in parallel
- **Phase 4**: Manual testing tasks must run sequentially (dependencies on running server)
- **Phase 5**: Version and changelog tasks can run in parallel

---

## Parallel Example: User Story 2 Documentation

```bash
# Launch all documentation updates in parallel (different files):
Task T008: "Update The Workbench Meta-Tools section in README.md"
Task T009: "Update Tool Invocation Modes section in README.md"
Task T010: "Remove usage examples showing close operations in README.md"
Task T011: "Add note about automatic cleanup in README.md"
Task T012: "Update workflow examples in README.md"
Task T013: "Update The Workbench Meta-Tools section in CLAUDE.md"
Task T014: "Update Tool Registration patterns in CLAUDE.md"
Task T015: "Update architecture overview in CLAUDE.md"

# Then sequentially update constitution (same file):
Task T016-T020: Constitution updates
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify build works)
2. Complete Phase 2: User Story 1 (core code changes)
3. Complete Phase 4: Manual Testing (validate functionality)
4. **STOP and VALIDATE**: Test that toolboxes work without close, cleanup happens on shutdown
5. Optionally skip User Story 2 (documentation) for quick testing

### Full Implementation

1. Complete Phase 1: Setup
2. **PARALLEL**: Complete Phase 2 (User Story 1) AND Phase 3 (User Story 2) simultaneously
3. Complete Phase 4: Manual Testing & Validation
4. Complete Phase 5: Release Preparation
5. Ready for merge and release

### Recommended Approach

Since this is a small feature with only 2 user stories and minimal code changes:

1. **Do Phase 1 + Phase 2 first** (Setup + Code Changes) - ~30 minutes
2. **Do Phase 4 Manual Testing** to validate code works - ~30 minutes
3. **Do Phase 3** (Documentation) - ~30-45 minutes (can be parallel with Phase 2 if desired)
4. **Do Phase 5** (Release prep) - ~15 minutes

**Total Estimated Time**: 2-3 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 1 (code changes) must complete before manual testing
- User Story 2 (documentation) can proceed in parallel with US1
- Manual testing validates both code changes and documentation completeness
- Constitution version bump is MINOR (1.3.0 → 1.4.0) because this adds a new simplified pattern (not breaking the constitution itself, updating it intentionally)
- Package version bump is MINOR (0.7.3 → 0.8.0) per relaxed semver in incubating phase (breaking API changes allowed in minor versions)
- Commit after each user story completion for clean git history
