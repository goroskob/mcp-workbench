# Tasks: Tool Naming Format Update

**Input**: Design documents from `/specs/002-tool-naming-format/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included - feature spec does not request tests, manual testing will be performed per TESTING.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Node.js application with TypeScript:
- Source code: `src/` at repository root
- Documentation: Repository root (README.md, CLAUDE.md, CHANGELOG.md, etc.)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify build environment and prepare for implementation

- [ ] T001 Verify TypeScript build succeeds with `npm run build` from repository root
- [ ] T002 [P] Verify current version is 0.4.0 in package.json
- [ ] T003 [P] Create backup of src/client-manager.ts before modifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational changes required - all work is within existing codebase

**Note**: This feature modifies existing files only, no new infrastructure needed

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Consistent Separator Convention (Priority: P1) 🎯 MVP

**Goal**: Update tool naming format to use consistent double underscores (`{toolbox}__{server}__{tool}`) in both tool generation and parsing logic

**Independent Test**: Open a toolbox with multiple servers (using workbench-config.test.json) and verify all registered tool names follow the new format with double underscores throughout

### Implementation for User Story 1

- [ ] T004 [US1] Update `generateToolName()` method in src/client-manager.ts (line ~58) to use double underscore between server and tool: `${toolboxName}__${serverName}__${originalToolName}`
- [ ] T005 [US1] Update `parseToolName()` method in src/client-manager.ts (lines ~23-51) to use `split('__', 3)` instead of mixed separator logic
- [ ] T006 [US1] Simplify `parseToolName()` validation to check for exactly 3 parts after split
- [ ] T007 [US1] Update error message in `parseToolName()` to show expected format `{toolbox}__{server}__{tool}` in src/client-manager.ts
- [ ] T008 [US1] Update tool registration error messages (lines ~304-311) in src/client-manager.ts to reference new format
- [ ] T009 [US1] Update toolbox lookup error messages (lines ~320-326) in src/client-manager.ts to reference new format
- [ ] T010 [US1] Update server lookup error messages (lines ~333-340) in src/client-manager.ts to reference new format
- [ ] T011 [US1] Update delegation error messages (lines ~350-361) in src/client-manager.ts to reference new format
- [ ] T012 [US1] Rebuild TypeScript with `npm run build` and verify no compilation errors
- [ ] T013 [US1] Manual test: Open toolbox in dynamic mode and verify tool names use new format
- [ ] T014 [US1] Manual test: Open toolbox in proxy mode and verify tool names use new format
- [ ] T015 [US1] Manual test: Verify parsing correctly extracts toolbox, server, and tool components
- [ ] T016 [US1] Manual test: Test tool name with underscores (e.g., `read_file`) parses correctly
- [ ] T017 [US1] Manual test: Test old format is rejected with clear error message

**Checkpoint**: At this point, the core naming format change is complete and functional in both dynamic and proxy modes

---

## Phase 4: User Story 2 - Backward Compatibility Handling (Priority: P2)

**Goal**: Document the incompatible change with migration guide and update all documentation to reflect new naming format

**Independent Test**: Review documentation files to verify clear explanation of the incompatible change with before/after examples and complete migration steps

### Implementation for User Story 2

- [ ] T018 [P] [US2] Update package.json version from 0.4.0 to 0.5.0
- [ ] T019 [P] [US2] Create CHANGELOG.md entry for v0.5.0 with incompatible change notice at repository root
- [ ] T020 [US2] Add migration guide section to README.md with before/after examples and migration checklist
- [ ] T021 [US2] Update "Tool Naming Convention" section in README.md with new format `{toolbox}__{server}__{tool}`
- [ ] T022 [US2] Find and replace all tool name examples in README.md (search for `__.*_` pattern, replace with `__.*__` pattern)
- [ ] T023 [US2] Update tool naming examples in CLAUDE.md architecture overview section
- [ ] T024 [US2] Update "Tool Name Conflicts" section in CLAUDE.md with new format examples
- [ ] T025 [US2] Find and replace all code examples in CLAUDE.md showing tool names
- [ ] T026 [US2] Update Principle II in .specify/memory/constitution.md to use new format `{toolbox}__{server}__{tool}`
- [ ] T027 [US2] Update examples in Principle II (lines ~52-54 in constitution.md) to show new format
- [ ] T028 [US2] Update Principle III in constitution.md to reference new naming convention
- [ ] T029 [US2] Bump constitution version from 1.1.0 to 1.2.0 and update "Last Amended" date
- [ ] T030 [US2] Update Sync Impact Report at top of constitution.md to document this change
- [ ] T031 [US2] Manual review: Verify README.md migration guide has at least 3 concrete examples
- [ ] T032 [US2] Manual review: Verify CHANGELOG.md clearly marks this as incompatible change despite minor version
- [ ] T033 [US2] Manual review: Verify all documentation consistently uses new format

**Checkpoint**: At this point, all documentation is updated and users have clear migration guidance

---

## Phase 5: User Story 3 - Tool Name Parsing Simplification (Priority: P3)

**Goal**: Verify parsing logic is simplified with no special cases for mixed separators (code quality improvement)

**Independent Test**: Review `parseToolName()` implementation to confirm it uses simple split-on-separator approach without conditional logic for different separator types

### Implementation for User Story 3

- [ ] T034 [US3] Code review: Verify `parseToolName()` in src/client-manager.ts uses only `split('__', 3)` without special underscore handling
- [ ] T035 [US3] Code review: Confirm no conditional logic for handling different separator patterns between segments
- [ ] T036 [US3] Code review: Verify parsing correctly handles tool names with single underscores (e.g., `read_file_async`)
- [ ] T037 [US3] Code review: Confirm parsing correctly handles edge case of tool names with double underscores
- [ ] T038 [US3] Compare code: Verify new `parseToolName()` is simpler than previous version (fewer lines, less complexity)
- [ ] T039 [US3] Performance check: Verify parsing performance is sub-millisecond for typical tool names

**Checkpoint**: All user stories are now independently functional, code is simplified and maintainable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and preparation for release

- [ ] T040 [P] Run full build: `npm run clean && npm run build` and verify success
- [ ] T041 [P] Verify git status shows only intended file modifications
- [ ] T042 Manual testing: Follow quickstart.md validation checklist
- [ ] T043 Manual testing: Test with workbench-config.test.json using real MCP servers
- [ ] T044 Manual testing: Verify error messages are user-friendly and guide to migration docs
- [ ] T045 Create git commit with message following conventional commits format
- [ ] T046 Create git tag v0.5.0
- [ ] T047 Review commit for completeness before push

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no foundational work required
- **User Story 1 (Phase 3)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (Phase 4)**: Can start after User Story 1 complete - Depends on code changes being done
- **User Story 3 (Phase 5)**: Can start after User Story 1 complete - Validates implementation quality
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - Can start after Setup
- **User Story 2 (P2)**: Depends on User Story 1 (needs code changes to document)
- **User Story 3 (P3)**: Depends on User Story 1 (reviews the implementation)

### Within Each User Story

**User Story 1**:
- T004-T011 can proceed sequentially (all modify src/client-manager.ts)
- T012 must complete before T013-T017 (build before testing)
- T013-T017 can run in parallel (different manual test scenarios)

**User Story 2**:
- T018-T019 can run in parallel (different files)
- T020-T025 should run sequentially (README and CLAUDE.md updates)
- T026-T030 should run sequentially (constitution updates)
- T031-T033 can run in parallel (different review tasks)

**User Story 3**:
- T034-T039 can run in parallel (all are review/verification tasks)

### Parallel Opportunities

- Within Setup (Phase 1): T002 and T003 can run in parallel
- Within User Story 1: T013-T017 (manual tests) can run in parallel
- Within User Story 2: T018-T019 can run in parallel
- Within User Story 2: T031-T033 (reviews) can run in parallel
- Within User Story 3: T034-T039 (all reviews) can run in parallel
- Within Polish: T040-T041 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Core implementation (sequential - same file):
Task T004: Update generateToolName() method
Task T005: Update parseToolName() method
Task T006: Simplify parseToolName() validation
# ... continue through T011

# Build (must complete before tests):
Task T012: npm run build

# Launch all manual tests together (parallel):
Task T013: "Manual test: dynamic mode"
Task T014: "Manual test: proxy mode"
Task T015: "Manual test: parsing extraction"
Task T016: "Manual test: underscores in tool name"
Task T017: "Manual test: old format rejection"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 3: User Story 1 (T004-T017)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Verify new naming format works in both modes
5. Deploy/demo if ready (note: may need documentation for users)

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 (T004-T017) → Test independently → Core change works! (MVP)
3. Add User Story 2 (T018-T033) → Test independently → Documentation complete
4. Add User Story 3 (T034-T039) → Test independently → Code quality validated
5. Polish (T040-T047) → Final validation and release preparation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together (minimal work)
2. Once Setup done:
   - Developer A: User Story 1 (T004-T017) - Core implementation
   - Developer B: Prepare documentation templates for User Story 2
3. After US1 complete:
   - Developer A: User Story 2 (T018-T033) - Documentation
   - Developer B: User Story 3 (T034-T039) - Code quality review
4. Both: Polish together (T040-T047)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after completing each user story phase
- Stop at any checkpoint to validate story independently
- All file paths are absolute from repository root
- No test suite exists - manual testing only per TESTING.md
- Total estimated time: ~55 minutes (per quickstart.md)

---

## Task Summary

**Total Tasks**: 47
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 0 tasks (no foundational work needed)
- **User Story 1 (Phase 3)**: 14 tasks (T004-T017)
- **User Story 2 (Phase 4)**: 16 tasks (T018-T033)
- **User Story 3 (Phase 5)**: 6 tasks (T034-T039)
- **Polish (Phase 6)**: 8 tasks (T040-T047)

**Parallel Opportunities**: 12 tasks marked with [P]
- Setup: 2 tasks
- User Story 1: 5 tasks (manual tests)
- User Story 2: 2 tasks (version + changelog), 3 tasks (reviews)
- User Story 3: 6 tasks (all reviews)
- Polish: 2 tasks

**Independent Test Criteria**:
- **US1**: Open toolbox and verify tool names use `{toolbox}__{server}__{tool}` format throughout
- **US2**: Review documentation to verify clear migration guide with examples
- **US3**: Review code to verify simplified parsing without special cases

**Suggested MVP**: User Story 1 only (T001-T017) - Core naming format change functional in both modes
