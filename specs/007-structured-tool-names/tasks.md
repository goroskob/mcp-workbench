# Tasks: Structured Tool Names

**Input**: Design documents from `/specs/007-structured-tool-names/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated tests requested - using manual testing approach per project's testing philosophy

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project structure: `src/`, `tests/` at repository root
- All source files in `src/` directory
- Documentation at repository root (README.md, CLAUDE.md, CHANGELOG.md)
- Project constitution in `.specify/memory/constitution.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and documentation prerequisites

- [x] T001 Update constitution.md to version 1.7.0 with structured naming principle in .specify/memory/constitution.md
- [x] T002 Bump version to 0.11.0 in package.json
- [x] T003 [P] Add breaking change entry to CHANGELOG.md for version 0.11.0

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type system that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define ToolIdentifier interface in src/types.ts with readonly fields (toolbox, server, tool)
- [x] T005 [P] Define ToolIdentifierSchema Zod validator in src/index.ts with strict mode and min(1) validation
- [x] T006 Update ToolInfo interface in src/types.ts to use separate toolbox_name and source_server fields (already complete from v0.10.0)
- [x] T007 Update UseToolInputSchema in src/index.ts to accept structured tool parameter
- [x] T008 Update OpenedToolbox interface in src/types.ts to remove registeredTools map (already complete from v0.10.0)
- [x] T009 [P] Define error message templates in src/index.ts (toolboxNotFound, serverNotFound, toolNotFound, invalidToolIdentifier)

**Checkpoint**: Type system ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Invoke Tools with Structured Names (Priority: P1) 🎯 MVP

**Goal**: Enable MCP clients to invoke tools using structured `{ toolbox, server, tool }` objects instead of concatenated strings

**Independent Test**: Open dev toolbox, call use_tool with structured format `{ "tool": { "toolbox": "dev", "server": "filesystem", "tool": "read_file" }, "arguments": { "path": "/etc/hosts" } }`, verify tool executes successfully

### Implementation for User Story 1

- [x] T010 [US1] Update use_tool handler in src/index.ts to parse structured tool parameter from UseToolInputSchema
- [x] T011 [US1] Implement structured tool lookup in src/client-manager.ts using ToolIdentifier (toolbox → server → tool)
- [x] T012 [US1] Update tool delegation in src/client-manager.ts to extract original tool name from ToolIdentifier (use_tool handler already uses tool field)
- [x] T013 [US1] Remove parseToolName method from src/client-manager.ts (no longer needed)
- [x] T014 [US1] Remove generateToolName method from src/client-manager.ts (no longer needed)
- [x] T015 [US1] Add Zod validation error handling in src/index.ts for use_tool structured parameter
- [x] T016 [US1] Update error responses in src/client-manager.ts to use separate field references (toolbox, server, tool)
- [ ] T017 [US1] Manual test: Invoke tool with valid structured identifier using workbench-config.test.json
- [ ] T018 [US1] Manual test: Verify tool routing with multiple toolboxes having same server name
- [ ] T019 [US1] Manual test: Test tool with special characters in name (containing __)

**Checkpoint**: At this point, User Story 1 should be fully functional - tools can be invoked with structured identifiers

---

## Phase 4: User Story 2 - Discover Tools with Structured Metadata (Priority: P1)

**Goal**: Return tool information from open_toolbox with separate toolbox_name, source_server, and name fields for easy use_tool construction

**Independent Test**: Call open_toolbox for dev toolbox, verify each tool has separate toolbox_name, source_server, name fields (not concatenated), construct use_tool call directly from returned fields

### Implementation for User Story 2

- [x] T020 [US2] Update getToolsFromConnections in src/client-manager.ts to set toolbox_name and source_server on ToolInfo
- [x] T021 [US2] Update getToolsFromConnections in src/client-manager.ts to use original tool name (not concatenated) in ToolInfo.name field
- [x] T022 [US2] Remove tool name concatenation logic in src/client-manager.ts (related to generateToolName removal)
- [x] T023 [US2] Update initialization instructions in src/index.ts to show structured format example
- [ ] T024 [US2] Manual test: Call open_toolbox and verify tool metadata has separate fields
- [ ] T025 [US2] Manual test: Verify tools from different servers with same name are distinguished by source_server
- [ ] T026 [US2] Manual test: Construct use_tool call from open_toolbox response without string manipulation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - full structured workflow from discovery to invocation

---

## Phase 5: User Story 3 - Readable Error Messages (Priority: P2)

**Goal**: Enhance error messages to reference toolbox, server, and tool names as separate components for easier debugging

**Independent Test**: Trigger error scenarios (invalid toolbox, invalid server, invalid tool, empty fields) and verify error messages show component-level context

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement toolboxNotFound error template usage in src/client-manager.ts (already implemented in findToolInToolbox)
- [x] T028 [P] [US3] Implement serverNotFound error template usage in src/client-manager.ts (already implemented in findToolInToolbox)
- [x] T029 [P] [US3] Implement toolNotFound error template usage in src/client-manager.ts (already implemented in findToolInToolbox)
- [x] T030 [US3] Implement invalidToolIdentifier error template usage in src/index.ts for Zod validation failures
- [ ] T031 [US3] Manual test: Trigger toolbox not found error and verify message format
- [ ] T032 [US3] Manual test: Trigger server not found error and verify hierarchical context
- [ ] T033 [US3] Manual test: Trigger tool not found error and verify full component path
- [ ] T034 [US3] Manual test: Send empty field in tool identifier and verify validation error

**Checkpoint**: All user stories should now be independently functional with enhanced error reporting

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final verification

- [x] T035 [P] Update README.md with structured tool naming examples replacing concatenated string examples
- [x] T036 [P] Update CLAUDE.md Architecture section to document structured naming pattern
- [x] T037 [P] Update CLAUDE.md Tool Naming Convention section to reflect ToolIdentifier approach (combined with T036)
- [x] T038 Update initialization instructions example in README.md to show structured format (part of T035)
- [x] T039 Verify SC-005: Run codebase search for `split('__')` and confirm zero matches in src/
- [x] T040 Verify SC-006: Run TypeScript compilation with strict mode enabled
- [ ] T041 Run comprehensive manual test suite from quickstart.md scenarios
- [x] T042 Build distribution artifacts (npm run build)
- [ ] T043 Test with real MCP servers (@modelcontextprotocol/server-memory, @modelcontextprotocol/server-filesystem)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on User Story 1 (can implement in parallel)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (error handling is orthogonal)

**Note**: US1 and US2 are both P1 priority and can be implemented in parallel, though US2 logically complements US1 (discovery → invocation workflow).

### Within Each User Story

- **User Story 1**: Implement use_tool parameter parsing → tool lookup → delegation → testing
- **User Story 2**: Update tool metadata construction → initialization instructions → testing
- **User Story 3**: All error template implementations can be done in parallel ([P] marked)

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005 and T009 can run in parallel (different files/sections)
- **Phase 3-5**: After Foundational phase, all three user stories can be worked on in parallel by different developers
- **Phase 5 (US3)**: T027, T028, T029 can all be implemented in parallel (different error cases)
- **Phase 6**: T035, T036, T037 can run in parallel (different documentation files)

---

## Parallel Example: Foundational Phase

```bash
# These can run in parallel after T004 completes:
Task: "Define ToolIdentifierSchema Zod validator in src/types.ts"
Task: "Define error message templates in src/index.ts"
```

## Parallel Example: User Story 3

```bash
# All error template implementations can run in parallel:
Task: "Implement toolboxNotFound error template usage in src/client-manager.ts"
Task: "Implement serverNotFound error template usage in src/client-manager.ts"
Task: "Implement toolNotFound error template usage in src/client-manager.ts"
```

## Parallel Example: User Stories

```bash
# After Foundational phase completes, with 3 developers:
Developer A: User Story 1 (T010-T019)
Developer B: User Story 2 (T020-T026)
Developer C: User Story 3 (T027-T034)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (constitution, version bump, changelog)
2. Complete Phase 2: Foundational (type system - CRITICAL, blocks all stories)
3. Complete Phase 3: User Story 1 (structured tool invocation)
4. Complete Phase 4: User Story 2 (structured tool discovery)
5. **STOP and VALIDATE**: Test end-to-end workflow (open_toolbox → use_tool)
6. Deploy/demo if ready (US1+US2 = complete workflow)

**Rationale**: US1 and US2 together form the minimal viable feature - tool discovery with structured metadata (US2) and tool invocation with structured identifiers (US1). US3 (error messages) is a quality-of-life improvement that can be added after core functionality works.

### Incremental Delivery

1. Complete Setup + Foundational → Type system ready
2. Add User Story 1 → Test independently → Structured invocation works
3. Add User Story 2 → Test independently → Full discovery-to-invocation workflow
4. **MILESTONE: Core feature complete** (can deploy at this point)
5. Add User Story 3 → Test independently → Enhanced error reporting
6. Polish phase → Documentation and final validation

### Parallel Team Strategy

With 2+ developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T010-T019) - Tool invocation
   - **Developer B**: User Story 2 (T020-T026) - Tool discovery
   - Both can work in parallel, minimal file conflicts
3. Either developer picks up User Story 3 (T027-T034)
4. Team collaborates on Polish phase

---

## File Impact Analysis

### src/types.ts (Heavy modification)
- Tasks: T004, T005, T006, T007, T008
- All type definitions updated for structured naming
- Multiple developers should coordinate on this file in Foundational phase

### src/index.ts (Moderate modification)
- Tasks: T009, T010, T015, T023, T030
- Schema updates and use_tool handler changes
- Can be split: schemas (Foundational) vs. handlers (US1)

### src/client-manager.ts (Heavy modification)
- Tasks: T011, T012, T013, T014, T016, T020, T021, T022, T027, T028, T029
- Core logic refactor for structured naming
- Significant changes across US1, US2, US3
- Consider sequential implementation if single developer

### Documentation files (Parallel-friendly)
- Tasks: T001, T003, T035, T036, T037, T038
- Different files, can all be done in parallel

---

## Success Validation Checklist

After implementation, verify all success criteria from spec.md:

- [ ] **SC-001**: Manual test - invoke tool with structured object, verify success
- [ ] **SC-002**: Manual test - open_toolbox returns directly usable fields
- [ ] **SC-003**: Manual test - tool name with __ characters routes correctly
- [ ] **SC-004**: Manual test - all error scenarios show component references
- [ ] **SC-005**: Code search - `grep -r "split('__')" src/` returns zero matches
- [ ] **SC-006**: TypeScript compilation - `npm run build` succeeds with strict mode

---

## Notes

- [P] tasks = different files/sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No automated tests per project's manual testing philosophy
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Breaking change requires minor version bump: 0.10.0 → 0.11.0
- No backward compatibility - clean break from string-based naming

## Manual Testing Approach

Per project's testing philosophy:
- Use `workbench-config.test.json` with real MCP servers
- Test with `@modelcontextprotocol/server-memory` and `@modelcontextprotocol/server-filesystem`
- Follow scenarios from `quickstart.md` for comprehensive coverage
- Validate each user story independently before proceeding to next
- Final validation: Complete workflow from spec.md acceptance scenarios

## Total Task Count

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (US1)**: 10 tasks
- **Phase 4 (US2)**: 7 tasks
- **Phase 5 (US3)**: 8 tasks
- **Phase 6 (Polish)**: 9 tasks

**Total**: 43 tasks

**Parallel opportunities**: 12 tasks marked [P] can run in parallel with other tasks
**User story independence**: 3 user stories can be implemented in parallel after Foundational phase
