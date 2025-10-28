# Tasks: Remove Dynamic Mode Support

**Input**: Design documents from `/specs/006-remove-dynamic-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This is a code removal and simplification feature - no new functionality is added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare for implementation by updating version and creating baseline

- [X] T001 Update package version from 0.9.0 to 0.10.0 in /Users/gleb/Projects/mcp-workbench/package.json
- [ ] T002 [P] Create backup branch or tag of current state for reference

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type system and configuration changes that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Remove `toolMode` field from WorkbenchConfig interface in /Users/gleb/Projects/mcp-workbench/src/types.ts (line 48-49)
- [X] T004 [P] Remove `registeredTools` field from OpenedToolbox interface in /Users/gleb/Projects/mcp-workbench/src/types.ts (line 115)
- [X] T005 [P] Consolidate OpenToolboxResult type to single variant (always returns tools array) in /Users/gleb/Projects/mcp-workbench/src/types.ts
- [X] T006 Remove RegisteredToolInfo type if no longer referenced in /Users/gleb/Projects/mcp-workbench/src/types.ts
- [X] T007 Add configuration validation to reject `"toolMode": "dynamic"` with clear error message in /Users/gleb/Projects/mcp-workbench/src/config-loader.ts
- [X] T008 Add warning log for deprecated `"toolMode": "proxy"` field in /Users/gleb/Projects/mcp-workbench/src/config-loader.ts

**Checkpoint**: Type system updated - user story implementation can now begin

---

## Phase 3: User Story 1 - Proxy-Based Tool Invocation (Priority: P1) 🎯 MVP

**Goal**: Ensure `use_tool` meta-tool works correctly with renamed tool and simplified code paths

**Independent Test**: Open a toolbox and call `use_tool` with valid parameters - tool should execute successfully and return results from downstream server

### Core Implementation for User Story 1

- [X] T009 [US1] Rename `workbench_use_tool` to `use_tool` in meta-tool registration in /Users/gleb/Projects/mcp-workbench/src/index.ts (line 283)
- [X] T010 [US1] Update `use_tool` description to reference new tool name in /Users/gleb/Projects/mcp-workbench/src/index.ts (lines 286-315)
- [X] T011 [US1] Update error messages in `use_tool` handler to use new tool name in /Users/gleb/Projects/mcp-workbench/src/index.ts
- [X] T012 [US1] Verify `ClientManager.findToolInToolbox()` works correctly (no changes needed) in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts
- [X] T013 [US1] Update error messages in `findToolInToolbox()` to reference `use_tool` instead of `workbench_use_tool` in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts (line 465)

**Checkpoint**: `use_tool` meta-tool fully functional with new name

---

## Phase 4: User Story 2 - Toolbox Opening with Tool Discovery (Priority: P1)

**Goal**: Ensure `open_toolbox` returns complete tool list and operates without dynamic registration

**Independent Test**: Call `open_toolbox` with valid toolbox name - response should include complete list of tools with schemas

### Remove Dynamic Mode Logic

- [ ] T014 [US2] Delete `ClientManager.registerToolsOnServer()` method entirely from /Users/gleb/Projects/mcp-workbench/src/client-manager.ts (lines 276-376, ~100 LOC)
- [ ] T015 [P] [US2] Delete `ClientManager.unregisterToolsFromServer()` method entirely from /Users/gleb/Projects/mcp-workbench/src/client-manager.ts (lines 381-395, ~15 LOC)
- [ ] T016 [P] [US2] Simplify `ClientManager.closeAllToolboxes()` to remove unregistration call in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts

### Update Meta-Tool Registration

- [ ] T017 [US2] Rename `workbench_open_toolbox` to `open_toolbox` in meta-tool registration in /Users/gleb/Projects/mcp-workbench/src/index.ts (line 210)
- [ ] T018 [US2] Remove `toolMode` conditional from `open_toolbox` description generation in /Users/gleb/Projects/mcp-workbench/src/index.ts (lines 119-207)
- [ ] T019 [US2] Update `open_toolbox` description to always describe proxy mode operation in /Users/gleb/Projects/mcp-workbench/src/index.ts
- [ ] T020 [US2] Remove `server: McpServer` parameter from `ClientManager.openToolbox()` method signature in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts
- [ ] T021 [US2] Remove `registerToolsOnServer()` call from `ClientManager.openToolbox()` in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts (lines 190-193)
- [ ] T022 [US2] Remove `sendToolListChanged()` call from `open_toolbox` handler in /Users/gleb/Projects/mcp-workbench/src/index.ts (line 247)
- [ ] T023 [US2] Remove `registeredTools` field initialization in `ClientManager.openToolbox()` in /Users/gleb/Projects/mcp-workbench/src/client-manager.ts
- [ ] T024 [US2] Update `open_toolbox` handler to always return full tools array (remove mode branching) in /Users/gleb/Projects/mcp-workbench/src/index.ts

### Update Initialization Instructions

- [ ] T025 [US2] Update `generateToolboxInstructions()` method to mention both `open_toolbox` and `use_tool` in /Users/gleb/Projects/mcp-workbench/src/index.ts
- [ ] T026 [US2] Change instructions text from "Use workbench_open_toolbox to connect" to "Use open_toolbox to connect to a toolbox, then use_tool to invoke tools" in /Users/gleb/Projects/mcp-workbench/src/index.ts

**Checkpoint**: `open_toolbox` fully functional, returns tool schemas, no dynamic registration

---

## Phase 5: User Story 3 - Configuration Migration (Priority: P2)

**Goal**: Ensure configurations work without `toolMode` field and dynamic mode is properly rejected

**Independent Test**: Load various configuration files and verify server starts successfully or fails with clear error

### Configuration Handling

- [ ] T027 [US3] Verify configuration validation rejects `"toolMode": "dynamic"` in /Users/gleb/Projects/mcp-workbench/src/config-loader.ts (implemented in T007)
- [ ] T028 [US3] Test configuration with no `toolMode` field - should work
- [ ] T029 [US3] Test configuration with `"toolMode": "proxy"` - should work with warning
- [ ] T030 [US3] Test configuration with `"toolMode": "dynamic"` - should fail with clear error

### Update Example Configurations

- [ ] T031 [P] [US3] Remove `toolMode` field from workbench-config.example.json in /Users/gleb/Projects/mcp-workbench/
- [ ] T032 [P] [US3] Add deprecation comment to workbench-config.test-proxy.json in /Users/gleb/Projects/mcp-workbench/
- [ ] T033 [P] [US3] Update any other example or test configurations found in research.md

**Checkpoint**: Configuration validation working, all example configs updated

---

## Phase 6: Documentation Updates

**Purpose**: Update all documentation to reflect proxy-only operation and renamed tools

### Constitution Updates (CRITICAL)

- [ ] T034 Update Principle I (Meta-Server Orchestration Pattern) in /Users/gleb/Projects/mcp-workbench/.specify/memory/constitution.md
  - Remove dynamic mode meta-tool count
  - Update to: "MUST expose exactly 2 meta-tools: `open_toolbox` and `use_tool`"
  - Remove `workbench_` prefix from tool names throughout

- [ ] T035 Update or remove Principle III (Mode-Agnostic Tool Invocation) in /Users/gleb/Projects/mcp-workbench/.specify/memory/constitution.md
  - Either remove entirely or rename to "Proxy-Only Tool Invocation"
  - Remove all dynamic mode references
  - Simplify to describe only proxy mode operation

- [ ] T036 Update Sync Impact Report header in /Users/gleb/Projects/mcp-workbench/.specify/memory/constitution.md
  - Version: 1.6.0 (or appropriate version)
  - Modified Principles: I, III
  - Note tool renaming and mode removal

### Primary Documentation

- [ ] T037 [P] Update README.md to remove all dynamic mode references in /Users/gleb/Projects/mcp-workbench/README.md
  - Search for "dynamic", "proxy", "mode"
  - Replace `workbench_open_toolbox` with `open_toolbox`
  - Replace `workbench_use_tool` with `use_tool`
  - Update all usage examples

- [ ] T038 [P] Update CLAUDE.md architecture documentation in /Users/gleb/Projects/mcp-workbench/CLAUDE.md
  - Remove "Tool Invocation Modes" section or simplify to proxy-only
  - Update meta-tools list (2 tools only)
  - Replace all old tool names with new names
  - Update architecture diagrams if present
  - Remove dynamic registration flow documentation

- [ ] T039 [P] Create CHANGELOG.md entry for v0.10.0 in /Users/gleb/Projects/mcp-workbench/CHANGELOG.md
  - **BREAKING CHANGES** section listing:
    - Dynamic mode removed
    - Meta-tools renamed (drop `workbench_` prefix)
    - Configuration field `toolMode` deprecated
  - Migration guide reference
  - Link to quickstart.md for detailed migration steps

### Verification and Cleanup

- [ ] T040 Search codebase for remaining `workbench_open_toolbox` references and update in all files
- [ ] T041 Search codebase for remaining `workbench_use_tool` references and update in all files
- [ ] T042 Search codebase for remaining "dynamic mode" references and remove/update in all files
- [ ] T043 Search codebase for remaining `toolMode` references and remove/update in all files
- [ ] T044 Search codebase for remaining `registeredTools` references and verify all removed

---

## Phase 7: Testing & Validation

**Purpose**: Verify all changes work correctly and no regressions introduced

### Manual Testing

- [ ] T045 Test with workbench-config.test-proxy.json - verify server starts successfully
- [ ] T046 Test `open_toolbox` meta-tool with real downstream server (e.g., @modelcontextprotocol/server-memory)
  - Verify returns full tool list with schemas
  - Verify idempotent behavior (calling twice on same toolbox)

- [ ] T047 Test `use_tool` meta-tool with real downstream tool
  - Open toolbox
  - Call `use_tool` with valid parameters
  - Verify tool executes and returns correct results
  - Test with multiple toolboxes and multiple tools

- [ ] T048 Test configuration validation
  - Config with no `toolMode`: should work
  - Config with `"toolMode": "proxy"`: should work with warning
  - Config with `"toolMode": "dynamic"`: should fail with clear error message

- [ ] T049 Test initialization instructions
  - Connect MCP client to workbench
  - Verify initialization response includes toolbox listing
  - Verify instructions mention `open_toolbox` and `use_tool`

### Verification

- [ ] T050 Run TypeScript compilation (`npm run build`) - should complete without errors
- [ ] T051 Verify no console errors or warnings in normal operation
- [ ] T052 Check that all User Story acceptance scenarios pass:
  - US1: Tool invocation via `use_tool`
  - US2: Toolbox opening with tool discovery
  - US3: Configuration migration

---

## Phase 8: Polish & Final Steps

**Purpose**: Final cleanup and preparation for release

- [ ] T053 [P] Review all code changes for consistency and clarity
- [ ] T054 [P] Ensure all documentation is updated and accurate
- [ ] T055 [P] Verify constitution principles are properly updated
- [ ] T056 [P] Verify CHANGELOG.md entry is complete and accurate
- [ ] T057 Run final grep commands from research.md Appendix C to verify complete removal
- [ ] T058 Commit all changes with descriptive commit message following conventional commits format
- [ ] T059 Prepare for merge: ensure all checkpoints passed, no TODO comments remain

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Can run in parallel with US1/US2
- **Documentation (Phase 6)**: Depends on all user stories (Phases 3-5) being complete
- **Testing (Phase 7)**: Depends on all implementation and documentation complete
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (US1)**: Independent - focuses on `use_tool` renaming and error messages
- **User Story 2 (US2)**: Independent - focuses on `open_toolbox` and removing dynamic registration
- **User Story 3 (US3)**: Independent - focuses on configuration validation

**Key Insight**: User Stories 1, 2, and 3 can be implemented in parallel by different developers after Phase 2 completes, as they modify different parts of the codebase.

### Within Each User Story

**User Story 1** (use_tool):
- All tasks in US1 touch similar code paths, execute sequentially

**User Story 2** (open_toolbox):
- T014-T016 (remove methods) can run in parallel [P]
- T017-T024 must run sequentially (modify same file)
- T025-T026 must run after T017-T024

**User Story 3** (configuration):
- T031-T033 can run in parallel [P] (different files)

### Parallel Opportunities

**Setup Phase**:
- T001 and T002 can run in parallel

**Foundational Phase**:
- T003, T004, T005, T006 can run in parallel [P] (same file, different sections)
- T007, T008 must run sequentially (same location in config-loader.ts)

**User Story Phases**:
- Phases 3, 4, 5 can run completely in parallel (different developers)

**Documentation Phase**:
- T037, T038, T039 can run in parallel [P] (different files)

---

## Parallel Example: User Story 2

```bash
# Launch these tasks together (remove methods - different sections of file):
Task: "T014 [US2] Delete ClientManager.registerToolsOnServer()"
Task: "T015 [US2] Delete ClientManager.unregisterToolsFromServer()"
Task: "T016 [US2] Simplify ClientManager.closeAllToolboxes()"

# Then launch these together (different files):
Task: "T031 [US3] Remove toolMode from workbench-config.example.json"
Task: "T032 [US3] Add deprecation comment to workbench-config.test-proxy.json"
Task: "T033 [US3] Update other example configs"

# Documentation updates in parallel:
Task: "T037 Update README.md"
Task: "T038 Update CLAUDE.md"
Task: "T039 Create CHANGELOG.md entry for v0.10.0"
```

---

## Implementation Strategy

### MVP First (Recommended)

**Minimum Viable Product**: User Stories 1 + 2 (proxy-based invocation and tool discovery)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (type system changes)
3. ✅ Complete Phase 3: User Story 1 (use_tool)
4. ✅ Complete Phase 4: User Story 2 (open_toolbox)
5. ⏸️ **STOP and VALIDATE**: Test tool invocation end-to-end
6. ✅ Complete Phase 5: User Story 3 (config validation)
7. ✅ Complete Phase 6: Documentation
8. ✅ Complete Phase 7: Testing
9. ✅ Complete Phase 8: Polish

**Why This Order**: US1 + US2 together provide complete proxy-only functionality. US3 (config validation) can be added after core functionality is proven.

### Incremental Delivery

1. **Setup + Foundational** → Type system ready
2. **+US1 (use_tool)** → Tool invocation renamed and working
3. **+US2 (open_toolbox)** → Tool discovery working, dynamic mode removed
4. **+US3 (config)** → Configuration validation complete
5. **+Documentation** → All docs updated
6. **+Testing** → Fully validated
7. **+Polish** → Ready for release

### Parallel Team Strategy

With 2-3 developers after Phase 2 completes:

- **Developer A**: User Story 1 (Phase 3) - `use_tool` renaming
- **Developer B**: User Story 2 (Phase 4) - `open_toolbox` and dynamic mode removal
- **Developer C**: User Story 3 (Phase 5) - Configuration migration
- **Team Together**: Documentation (Phase 6), Testing (Phase 7), Polish (Phase 8)

Stories integrate cleanly as they touch different code sections.

---

## Task Summary

**Total Tasks**: 59
- Phase 1 (Setup): 2 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (US1): 5 tasks
- Phase 4 (US2): 13 tasks
- Phase 5 (US3): 7 tasks
- Phase 6 (Documentation): 12 tasks
- Phase 7 (Testing): 8 tasks
- Phase 8 (Polish): 6 tasks

**Parallel Opportunities**: 15 tasks marked [P]

**User Story Breakdown**:
- US1 (Proxy-Based Tool Invocation): 5 tasks
- US2 (Toolbox Opening with Tool Discovery): 13 tasks
- US3 (Configuration Migration): 7 tasks

**Independent Testing**:
- US1: Test `use_tool` with valid parameters
- US2: Test `open_toolbox` returns tool schemas
- US3: Test configuration validation rules

**Suggested MVP Scope**: Phases 1-4 (Setup + Foundational + US1 + US2) = Core proxy-only functionality

---

## Notes

- This is a code removal feature (~300 LOC removed, ~50 LOC updated)
- No new features added - only simplification and renaming
- All [P] tasks operate on different files or different sections and can run truly in parallel
- Each user story is independently testable via its acceptance scenarios
- Constitution updates (Phase 6) are MANDATORY before merge
- Version bump to 0.10.0 reflects breaking API change
- Manual testing required (no automated test suite for this feature)

---

**Task Generation Complete** ✅
**Ready for**: `/speckit.implement` or manual implementation
**Critical Path**: Phase 2 (Foundational) must complete before any user story work begins
