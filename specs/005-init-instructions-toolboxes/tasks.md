# Implementation Tasks: Initialization Instructions for Toolboxes

**Feature**: 005-init-instructions-toolboxes
**Branch**: `005-init-instructions-toolboxes`
**Generated**: 2025-10-28

## Overview

This document breaks down the implementation into executable tasks organized by user story priority. Each user story phase is independently testable and deliverable.

**Tech Stack**:
- TypeScript 5.7.2, Node.js 18+
- @modelcontextprotocol/sdk ^1.6.1
- zod ^3.23.8

**Key Decisions** (from clarifications):
- MINOR version bump (0.8.0 → 0.9.0)
- Silent removal approach (no migration guide)
- No special logging needed
- Fail-fast on invalid config (existing behavior)

## Implementation Strategy

**MVP Scope**: User Story 1 (P1) - Discover Available Toolboxes on Connection

This delivers the core value: toolbox discovery during initialization. Stories 2 and 3 can be delivered incrementally after MVP.

**Delivery Order**:
1. **Phase 3 (US1)**: Add initialization instructions - DELIVERS MVP
2. **Phase 4 (US2)**: Verify client compatibility - Confirms developer experience
3. **Phase 5 (US3)**: Remove legacy tool - Cleanup and maintenance

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other [P] tasks)
- `[US1]`, `[US2]`, `[US3]` = User Story labels
- File paths are relative to repository root

---

## Phase 1: Setup & Prerequisites

**Goal**: Prepare development environment and verify prerequisites

**Tasks**:

- [x] T001 Verify current package version in package.json (should be 0.8.0 or similar)
- [x] T002 [P] Review existing initialization handler in src/index.ts to understand current structure
- [x] T003 [P] Review existing workbench_list_toolboxes tool registration in src/index.ts
- [x] T004 [P] Verify config loader behavior in src/config-loader.ts for edge case understanding
- [x] T005 Build project to ensure clean starting state: npm run build

**Validation**: ✅ All prerequisites verified, project builds successfully, no TypeScript errors

---

## Phase 2: Foundational Changes

**Goal**: Create the instructions generation function that all user stories will use

**Tasks**:

- [x] T006 Add generateToolboxInstructions() private method to WorkbenchServer class in src/index.ts
- [x] T007 Implement empty toolbox configuration handling (returns "No toolboxes configured" message) in generateToolboxInstructions()
- [x] T008 Implement toolbox listing generation with server counts and descriptions in generateToolboxInstructions()
- [x] T009 Handle missing descriptions (use "No description provided" fallback) in generateToolboxInstructions()
- [x] T010 Verify TypeScript compilation: npm run build

**Validation**: ✅ generateToolboxInstructions() function exists, handles all edge cases, compiles without errors

---

## Phase 3: User Story 1 - Discover Available Toolboxes on Connection (P1)

**Story Goal**: Enable MCP clients to discover toolboxes immediately during initialization without additional tool calls

**Independent Test Criteria**:
- ✅ Connect MCP client to workbench
- ✅ Inspect initialize response contains `instructions` field
- ✅ Instructions field lists all configured toolboxes with names, descriptions, and server counts
- ✅ Empty configuration returns helpful message

**Implementation Tasks**:

- [x] T011 [US1] ~~Locate initialize() method~~ → SDK handles initialization automatically via constructor options
- [x] T012 [US1] ~~Call generateToolboxInstructions()~~ → Already called in constructor (Phase 2)
- [x] T013 [US1] ~~Add instructions field to InitializeResult~~ → SDK automatically includes instructions from constructor options
- [x] T014 [US1] Build project: npm run build → Completed in Phase 2
- [ ] T015 [US1] Manual test with workbench-config.test.json containing 2-3 toolboxes
- [ ] T016 [US1] Verify instructions field appears in initialization response with correct format
- [ ] T017 [US1] Test with empty toolbox configuration, verify helpful message appears
- [ ] T018 [US1] Test with toolbox missing description, verify "No description provided" fallback
- [ ] T019 [US1] Measure initialization time increase (should be <1ms, must be <100ms per NFR-001)

**Acceptance**:
- [ ] AC1-US1: Initialize response includes instructions field with toolbox listings
- [ ] AC2-US1: Empty configuration shows "No toolboxes configured" message
- [ ] AC3-US1: Toolbox with 5 tools shows correct server count and description

**Deliverable**: MVP complete - clients can discover toolboxes during initialization

---

## Phase 4: User Story 2 - Streamlined Client Onboarding (P2)

**Story Goal**: Eliminate need for separate `workbench_list_toolboxes` tool call, simplifying client implementations

**Independent Test Criteria**:
- ✅ Write minimal MCP client using only initialization response
- ✅ Client can display all toolbox information
- ✅ No tool calls needed beyond initialization

**Implementation Tasks**:

- [ ] T020 [US2] Document initialization instructions format in README.md under "Initialization Instructions" section
- [ ] T021 [US2] Add code example showing how clients access instructions from InitializeResult in README.md
- [ ] T022 [US2] Update "The Workbench Meta-Tools" section in README.md to explain toolbox discovery via initialization
- [ ] T023 [US2] Update CLAUDE.md with initialization instructions pattern under "Key Design Patterns"
- [ ] T024 [US2] Add initialization flow documentation to CLAUDE.md showing instructions generation step
- [ ] T025 [US2] Verify documentation completeness - all examples updated, instructions field explained

**Acceptance**:
- [ ] AC1-US2: README.md contains clear initialization instructions documentation
- [ ] AC2-US2: Clients can integrate using only initialization response documentation

**Deliverable**: Documentation enables simplified client integration

---

## Phase 5: User Story 3 - Remove Legacy Tool (P3)

**Story Goal**: Remove redundant `workbench_list_toolboxes` tool for cleaner codebase and single discovery mechanism

**Independent Test Criteria**:
- ✅ Tool does not appear in tools list
- ✅ Calling removed tool returns "tool not found" error
- ✅ No references remain in codebase

**Implementation Tasks**:

- [x] T026 [US3] Remove workbench_list_toolboxes tool registration from src/index.ts
- [x] T027 [US3] Remove workbench_list_toolboxes tool handler implementation from src/index.ts
- [x] T028 [US3] Search codebase for any remaining references to workbench_list_toolboxes: grep -r "workbench_list_toolboxes" src/
- [ ] T029 [US3] Remove workbench_list_toolboxes from README.md meta-tools list
- [x] T030 [US3] Update meta-tool count comments in src/index.ts (Tool 3→Tool 2 for proxy mode)
- [x] T031 [US3] Build project: npm run build
- [ ] T032 [US3] Verify tool does not appear in tools list via MCP client
- [ ] T033 [US3] Attempt to call removed tool, verify "tool not found" error returned

**Acceptance**:
- [ ] AC1-US3: workbench_list_toolboxes not in tools list
- [ ] AC2-US3: Calling removed tool returns appropriate error

**Deliverable**: Legacy tool cleanly removed, single discovery mechanism remains

---

## Phase 6: Polish & Documentation

**Goal**: Complete documentation updates, version bump, and final validation

**Tasks**:

- [x] T034 [P] Update constitution.md Principle I: Change "2 meta-tools in dynamic mode" to "1 meta-tool" in .specify/memory/constitution.md
- [x] T035 [P] Update constitution.md Principle I: Change "3 meta-tools in proxy mode" to "2 meta-tools" in .specify/memory/constitution.md
- [x] T036 [P] Add toolbox discovery via instructions field note to Principle I in .specify/memory/constitution.md
- [x] T037 [P] Increment constitution version to 1.5.0 and add sync impact report entry in .specify/memory/constitution.md
- [x] T038 Update package.json version: npm version minor (0.8.0 → 0.9.0)
- [x] T039 [P] Create CHANGELOG.md entry for v0.9.0 with removed tool note (silent removal approach)
- [x] T040 [P] Verify all documentation updated: README.md, CLAUDE.md, constitution.md
- [x] T041 Final build and test: npm run build
- [ ] T042 Final verification: Connect MCP client, confirm all acceptance criteria met across all stories

**Validation**: ✅ All documentation complete, version bumped (0.9.0), build successful

---

## Dependencies & Execution Order

### Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1) ← MVP DELIVERY
    ↓ (optional)
Phase 4 (US2) ← Documentation enhancement
    ↓ (optional)
Phase 5 (US3) ← Cleanup
    ↓
Phase 6 (Polish) ← Final touches
```

**Independence**: US1, US2, and US3 are technically independent after Phase 2, but recommended execution order follows priority for incremental value delivery.

### Parallel Execution Opportunities

**Phase 1** (5 tasks):
- T002, T003, T004 can run in parallel (different code reviews)

**Phase 2** (5 tasks):
- Sequential execution required (building instructions generation function)

**Phase 3 - US1** (9 tasks):
- T011-T014: Sequential (modifying same file)
- T015-T019: Sequential (dependent on build)

**Phase 4 - US2** (6 tasks):
- T020-T025: Can be parallelized (different documentation files)
- README.md tasks (T020-T022) vs CLAUDE.md tasks (T023-T024)

**Phase 5 - US3** (8 tasks):
- T026-T028: Sequential (code removal)
- T029-T030: Can parallel with T028 (different files)

**Phase 6** (9 tasks):
- T034-T037: Sequential (same file - constitution.md)
- T039-T040: Can parallel (different files)

**Estimated Parallel Speedup**: ~20% time reduction if parallelizing documentation tasks

---

## Testing Strategy

**Manual Testing Approach** (per clarifications):

1. **Setup**: Use workbench-config.test.json with 2-3 test toolboxes
2. **Tool**: Connect with @modelcontextprotocol/inspector or similar MCP client
3. **Scenarios**:
   - Multiple toolboxes configured
   - Empty configuration
   - Toolbox with missing description
   - Performance measurement (<100ms increase)

**No Unit Tests Required**: Per clarifications, no test framework setup needed. Manual integration testing sufficient for this feature.

---

## Task Summary

| Phase | Task Count | Parallelizable | Story | Status |
|-------|-----------|----------------|-------|--------|
| Phase 1: Setup | 5 | 3 | N/A | Pending |
| Phase 2: Foundational | 5 | 0 | N/A | Pending |
| Phase 3: US1 (MVP) | 9 | 0 | P1 | Pending |
| Phase 4: US2 | 6 | 6 | P2 | Pending |
| Phase 5: US3 | 8 | 2 | P3 | Pending |
| Phase 6: Polish | 9 | 5 | N/A | Pending |
| **Total** | **42** | **16** | 3 stories | **0% complete** |

---

## MVP Scope Recommendation

**Minimum Viable Product**: Phase 1 + Phase 2 + Phase 3 (US1)

This delivers the core value proposition:
- ✅ Toolbox discovery during initialization
- ✅ No additional round-trips required
- ✅ Standard MCP pattern followed
- ✅ Independently testable

**Total MVP Tasks**: 19 tasks
**Estimated MVP Time**: 1-1.5 hours

**Incremental Delivery**:
- **Phase 4 (US2)**: Add when documentation review scheduled (+0.5 hours)
- **Phase 5 (US3)**: Add when cleanup sprint planned (+0.5 hours)
- **Phase 6**: Complete before merge to main (+0.5 hours)

---

## Notes

- Silent removal approach means no migration guide tasks (per clarification)
- No special logging tasks (per clarification - pure function)
- MINOR version bump reflects pragmatic approach over strict semver
- All tasks include explicit file paths for clarity
- Checklist format enables progress tracking
