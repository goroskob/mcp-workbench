# Tasks: Support Multiple Toolboxes with Duplicate Tools

**Input**: Design documents from `/specs/001-duplicate-tools-support/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Tests are NOT requested in the specification. Manual testing will be performed with real MCP servers.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single TypeScript project**: `src/` at repository root
- All changes confined to existing 4 source files: `src/types.ts`, `src/client-manager.ts`, `src/index.ts`, `src/config-loader.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Validate current environment and prepare for implementation

- [X] T001 Review current codebase structure in src/ directory
- [X] T002 Verify TypeScript 5.7.2 and dependencies (@modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8)
- [X] T003 [P] Review existing tool naming logic in src/client-manager.ts:224
- [X] T004 [P] Review existing OpenedToolbox structure in src/types.ts:118-125

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type system changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update RegisteredToolInfo type to add toolbox_name field in src/types.ts
- [X] T006 Add tool name parsing utility function to src/client-manager.ts (parseToolName helper)
- [X] T007 Add tool name generation utility function to src/client-manager.ts (generateToolName helper)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Open Multiple Toolboxes with Same Server (Priority: P1) 🎯 MVP

**Goal**: Allow multiple toolboxes to be opened with duplicate server configurations without errors

**Independent Test**: Configure two toolboxes ("dev" and "prod") both with the same filesystem server, open "dev" toolbox, then open "prod" toolbox successfully, verify both can invoke tools from their respective server instances

### Implementation for User Story 1

- [X] T008 [US1] Update registerToolsOnServer method in src/client-manager.ts to use {toolbox}__{server}_{tool} naming format
- [X] T009 [US1] Update tool registration to include toolbox_name in tool metadata in src/client-manager.ts
- [X] T010 [US1] Update tool description prefix from [server] to [toolbox/server] format in src/client-manager.ts
- [X] T011 [US1] Update openToolbox method to pass toolbox name to registration logic in src/client-manager.ts
- [ ] T012 [US1] Test with workbench-config.test.json containing duplicate servers (dev and prod toolboxes with same filesystem server)
- [ ] T013 [US1] Verify both toolboxes open without errors and tools are registered with correct names

**Checkpoint**: At this point, User Story 1 should be fully functional - multiple toolboxes with duplicate servers can be opened without conflicts

---

## Phase 4: User Story 2 - Unique Tool Naming Across Toolboxes (Priority: P1)

**Goal**: Tools from different toolbox instances must be uniquely addressable and invocable

**Independent Test**: Open two toolboxes with the same server/tools, list available tools, verify each tool has a unique identifier (e.g., dev__filesystem_read_file vs. prod__filesystem_read_file), invoke both tools and verify correct routing

### Implementation for User Story 2

- [X] T014 [US2] Update tool handler in src/client-manager.ts to parse registered tool name and extract toolbox, server, originalTool
- [X] T015 [US2] Update tool handler to look up correct toolbox from openedToolboxes map using parsed toolbox name
- [X] T016 [US2] Update tool handler to look up correct server connection from toolbox.connections using parsed server name
- [X] T017 [US2] Update tool handler to delegate to downstream server using original_name from metadata in src/client-manager.ts
- [X] T018 [US2] Add validation in tool handler to ensure parsed toolbox exists in openedToolboxes map
- [X] T019 [US2] Add validation in tool handler to ensure parsed server exists in toolbox's connections map
- [X] T020 [US2] Update getToolsFromConnections method (proxy mode) to use {toolbox}__{server}_{tool} naming in src/client-manager.ts
- [ ] T021 [US2] Test tool invocation with dev__filesystem_read_file and prod__filesystem_read_file to verify correct routing
- [ ] T022 [US2] Verify tool metadata includes correct toolbox_name field

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - tools are uniquely named and correctly routed to their respective server instances

---

## Phase 5: User Story 3 - Independent Toolbox Lifecycle Management (Priority: P2)

**Goal**: Toolboxes can be opened and closed independently without affecting other toolboxes with duplicate servers

**Independent Test**: Open three toolboxes ("dev", "staging", "prod") where "dev" and "prod" both use "filesystem" server, close "dev" toolbox, verify "staging" and "prod" remain open with all tools functional

### Implementation for User Story 3

- [X] T023 [US3] Update unregisterToolsFromServer method to only remove tools from the specific toolbox being closed in src/client-manager.ts
- [X] T024 [US3] Update closeToolbox method to iterate through the specific toolbox's registeredTools map and call .remove() on each
- [X] T025 [US3] Update closeToolbox method to only close connections in the specific toolbox's connections map
- [X] T026 [US3] Add validation to ensure closing one toolbox doesn't affect registeredTools in other open toolboxes
- [ ] T027 [US3] Test with three toolboxes (dev, staging, prod) where dev and prod share a filesystem server
- [ ] T028 [US3] Close dev toolbox and verify staging and prod remain functional with all tools accessible
- [ ] T029 [US3] Verify dev__filesystem_* tools are removed but prod__filesystem_* tools remain registered

**Checkpoint**: All P1 and P2 user stories should now be independently functional - toolboxes can be opened and closed independently without affecting duplicates

---

## Phase 6: Error Handling & Edge Cases

**Purpose**: Robust error handling for complex scenarios with duplicate servers

- [X] T030 [P] Update error messages in src/client-manager.ts to include toolbox context ([toolbox/server/tool] format)
- [X] T031 [P] Add error handling for tool name parsing failures in tool handler (invalid format detection)
- [X] T032 [P] Add error handling for missing toolbox in openedToolboxes map during tool invocation
- [X] T033 [P] Add error handling for missing server in toolbox.connections during tool invocation
- [ ] T034 Test error scenarios: invoke tool with invalid name format, toolbox not found, server not found
- [ ] T035 Verify error messages include full context (toolbox/server/tool) for debugging

---

## Phase 7: Documentation Updates (Mandatory per Constitution)

**Purpose**: Update user-facing and developer-facing documentation

- [X] T036 [P] Update README.md with new tool naming convention ({toolbox}__{server}_{tool})
- [X] T037 [P] Update README.md with usage examples showing duplicate toolbox scenarios
- [X] T038 [P] Add migration guide to README.md for users upgrading from old version
- [X] T039 [P] Update CLAUDE.md Tool Naming Convention section (Principle II) with new pattern
- [X] T040 [P] Update CLAUDE.md Architecture Overview with tool registration logic changes
- [X] T041 [P] Update CLAUDE.md with toolbox-level prefixing explanation in client-manager.ts section
- [X] T042 [P] Create CHANGELOG.md entry documenting breaking change in tool naming
- [X] T043 Verify all documentation examples use correct {toolbox}__{server}_{tool} format

---

## Phase 8: Testing & Validation

**Purpose**: Comprehensive manual testing with real MCP servers

**Note**: Testing infrastructure complete. All tests require manual execution with MCP client. See TESTING.md for detailed instructions.

- [X] T044 Create test configuration workbench-config-duplicate.json with dev/prod toolboxes using same memory server
- [ ] T045 Test Scenario 1: Open single toolbox, verify tools use {toolbox}__{server}_{tool} format (MANUAL)
- [ ] T046 Test Scenario 2: Open two toolboxes with duplicate servers, verify both open successfully (MANUAL)
- [ ] T047 Test Scenario 3: Invoke tools from both toolboxes, verify correct routing to respective server instances (MANUAL)
- [ ] T048 Test Scenario 4: Close one toolbox, verify other remains functional (MANUAL)
- [ ] T049 Test Scenario 5: Re-open closed toolbox, verify it works correctly (MANUAL)
- [ ] T050 Test Scenario 6: Open 5+ toolboxes with overlapping servers (scale test per SC-001) (MANUAL)
- [ ] T051 Test Scenario 7: Proxy mode with duplicate servers (if proxy mode enabled) (MANUAL)
- [ ] T052 Test Scenario 8: Error handling - invalid tool name, missing toolbox, missing server (MANUAL)
- [ ] T053 Verify all success criteria from spec.md are met (SC-001 through SC-006) (MANUAL)

---

## Phase 9: Polish & Constitution Amendment

**Purpose**: Final improvements and constitutional updates

- [X] T054 [P] Code review: Verify TypeScript strict mode compliance
- [X] T055 [P] Code review: Ensure all error messages include toolbox context
- [X] T056 [P] Code review: Verify no implementation details leaked into spec/plan
- [ ] T057 Run quickstart.md validation with example scenarios
- [ ] T058 Performance validation: Verify toolbox operations <100ms (Performance Goal from plan.md)
- [ ] T059 Performance validation: Verify tool routing overhead <50ms (Performance Goal from plan.md)
- [X] T060 Create constitution amendment PR for Principle II (Tool Naming and Conflict Resolution)
- [X] T061 Update constitution version from 1.0.0 to 1.1.0 with Sync Impact Report

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational - No dependencies on other stories
  - US2 (P1): Can start after Foundational - No dependencies on US1 (but logically builds on it)
  - US3 (P2): Can start after Foundational - No dependencies on US1/US2 (but logically builds on them)
- **Error Handling (Phase 6)**: Can start after US2 (needs tool handler logic)
- **Documentation (Phase 7)**: Can start in parallel with user stories (independent file changes)
- **Testing (Phase 8)**: Depends on US1, US2, US3 completion
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Delivers: Multiple toolboxes with duplicate servers can be opened
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Builds logically on US1 but can be implemented independently
  - Delivers: Unique tool naming and correct routing
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Builds logically on US1/US2 but can be implemented independently
  - Delivers: Independent lifecycle management

### Within Each User Story

- US1: Naming format update → Metadata update → Description format → Testing
- US2: Handler parsing → Toolbox lookup → Server lookup → Delegation → Validation → Proxy mode → Testing
- US3: Unregister logic → Close logic → Validation → Testing

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel (different code reviews)
- **Phase 2**: T005, T006, T007 can run in parallel if careful (different functions, but same file)
- **Phase 6**: All error handling tasks (T030-T033) can run in parallel (different error scenarios)
- **Phase 7**: All documentation tasks (T036-T043) can run in parallel (different files)
- **Phase 9**: T054, T055, T056 can run in parallel (different review aspects)

---

## Parallel Example: User Story 2

```bash
# Launch validation tasks in parallel:
Task T018: "Add validation in tool handler to ensure parsed toolbox exists"
Task T019: "Add validation in tool handler to ensure parsed server exists"

# Both update src/client-manager.ts but in different validation branches
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories) ✓
3. Complete Phase 3: User Story 1 ✓ → **VALIDATE**: Two toolboxes with duplicate servers can open
4. Complete Phase 4: User Story 2 ✓ → **VALIDATE**: Tools are uniquely named and correctly routed
5. **STOP and VALIDATE**: Test US1 + US2 together independently
6. Deploy/demo if ready (US1 + US2 = core functionality)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP Checkpoint** (duplicate toolboxes work)
3. Add User Story 2 → Test independently → **Full P1 Checkpoint** (unique naming + routing work)
4. Add User Story 3 → Test independently → **Full Feature Checkpoint** (lifecycle management works)
5. Add Error Handling → Robust error messages
6. Add Documentation → User-facing changes documented
7. Add Testing & Polish → Production ready

### Sequential Strategy (Recommended)

Since all changes are in the same 4 files, sequential implementation is recommended:

1. **Phase 1-2**: Foundation (T001-T007)
2. **Phase 3**: User Story 1 (T008-T013) → Validate
3. **Phase 4**: User Story 2 (T014-T022) → Validate
4. **Phase 5**: User Story 3 (T023-T029) → Validate
5. **Phase 6**: Error Handling (T030-T035)
6. **Phase 7**: Documentation (T036-T043) - Can overlap with implementation
7. **Phase 8**: Testing (T044-T053)
8. **Phase 9**: Polish (T054-T061)

---

## Notes

- [P] tasks = different files or independent code sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All changes confined to 4 files: src/types.ts, src/client-manager.ts, src/index.ts, src/config-loader.ts
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Breaking Change**: Tool names will change from {server}_{tool} to {toolbox}__{server}_{tool}
- **No tests included**: Manual testing with real MCP servers (per specification)
- **Constitution Amendment Required**: Principle II must be updated post-implementation

---

## MVP Scope (Minimum Viable Product)

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 + Phase 4 (User Stories 1 & 2)

**What MVP Delivers**:
- ✅ Multiple toolboxes with duplicate servers can be opened (US1)
- ✅ Tools are uniquely named with {toolbox}__{server}_{tool} format (US2)
- ✅ Tools are correctly routed to their respective server instances (US2)
- ✅ Core functionality complete and testable

**What MVP Defers**:
- Independent lifecycle management (US3) - can be added later
- Comprehensive error handling (Phase 6) - basic errors handled
- Full documentation updates (Phase 7) - minimal docs for MVP
- Extensive testing (Phase 8) - basic validation for MVP
- Constitution amendment (Phase 9) - post-MVP

**MVP Validation**:
1. Create config with dev + prod toolboxes, both using filesystem server
2. Open dev toolbox → verify tools registered as dev__filesystem_*
3. Open prod toolbox → verify tools registered as prod__filesystem_*
4. Invoke dev__filesystem_read_file → verify reads from dev path
5. Invoke prod__filesystem_read_file → verify reads from prod path
6. ✅ MVP Success if both work correctly without conflicts
