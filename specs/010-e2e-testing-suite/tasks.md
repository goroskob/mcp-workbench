# Tasks: End-to-End Testing Suite

**Input**: Design documents from `/specs/010-e2e-testing-suite/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- E2E tests at repository root: `e2e/`
- Test fixtures: `e2e/fixtures/`
- Test helpers: `e2e/helpers/`
- Test scenarios: `e2e/scenarios/`
- CI workflows: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and E2E test framework setup

- [X] T001 Install Vitest and E2E testing dependencies in package.json (vitest, @types/node)
- [X] T002 [P] Install downstream MCP server packages in package.json (@modelcontextprotocol/server-memory, @modelcontextprotocol/server-filesystem)
- [X] T003 Create E2E test configuration file vitest.config.e2e.ts at repository root
- [X] T004 [P] Add E2E test scripts to package.json (test:e2e, test:e2e:watch)
- [X] T005 Create E2E directory structure (e2e/fixtures/, e2e/helpers/, e2e/scenarios/)
- [X] T006 [P] Create TypeScript type definitions file e2e/helpers/types.ts for test entities

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story E2E tests can be written

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement port allocation helper in e2e/helpers/isolation.ts (allocatePort function)
- [X] T008 Implement server manager in e2e/helpers/server-manager.ts (startServer, stopServer functions)
- [X] T009 Implement MCP client factory in e2e/helpers/client-factory.ts (createMCPClient function)
- [X] T010 [P] Implement MCPTestClient wrapper class in e2e/helpers/client-factory.ts (openToolbox, useTool, disconnect methods)
- [X] T011 [P] Create custom Vitest assertions in e2e/helpers/assertions.ts (toHaveToolInToolbox, toMatchToolSchema, toReturnErrorWithContext)
- [X] T012 [P] Create test fixture: valid-single-toolbox.json in e2e/fixtures/configs/
- [X] T013 [P] Create test fixture: valid-multiple-toolboxes.json in e2e/fixtures/configs/
- [X] T014 [P] Create test fixture: valid-with-env-vars.json in e2e/fixtures/configs/
- [X] T015 [P] Create test fixture: valid-with-tool-filters.json in e2e/fixtures/configs/
- [X] T016 [P] Create test fixture: invalid-missing-server.json in e2e/fixtures/configs/
- [X] T017 [P] Create test fixture: invalid-bad-syntax.json in e2e/fixtures/configs/
- [X] T018 [P] Create downstream server setup helpers in e2e/fixtures/downstream-servers/test-server-setup.ts
- [X] T019 [P] Create expected tool schemas in e2e/fixtures/expected-responses/tool-schemas.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Complete Workbench Workflow Validation (Priority: P1) 🎯 MVP

**Goal**: Validate entire workbench workflow from configuration loading through tool execution

**Independent Test**: Start workbench server, connect MCP client, open toolbox, execute tools, verify cleanup

### Implementation for User Story 1

- [X] T020 [US1] Create test file e2e/scenarios/workflow-validation.e2e.ts with test suite structure
- [X] T021 [US1] Implement Test 1.1: Server initialization and connection test in workflow-validation.e2e.ts
- [X] T022 [US1] Implement Test 1.2: Open toolbox and retrieve tools test in workflow-validation.e2e.ts
- [X] T023 [US1] Implement Test 1.3: Execute tool via use_tool test in workflow-validation.e2e.ts
- [X] T024 [US1] Implement Test 1.4: Proper connection cleanup test in workflow-validation.e2e.ts
- [X] T025 [US1] Implement Test 1.5: Full workflow integration test in workflow-validation.e2e.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Configuration Validation Testing (Priority: P2)

**Goal**: Validate different configuration scenarios work correctly

**Independent Test**: Test various configs (env vars, tool filters, multiple toolboxes, invalid configs)

### Implementation for User Story 2

- [ ] T026 [US2] Create test file e2e/scenarios/configuration.e2e.ts with test suite structure
- [ ] T027 [US2] Implement Test 2.1: Environment variable expansion test in configuration.e2e.ts
- [ ] T028 [US2] Implement Test 2.2: Tool filters test in configuration.e2e.ts
- [ ] T029 [US2] Implement Test 2.3: Multiple toolboxes test in configuration.e2e.ts
- [ ] T030 [US2] Implement Test 2.4: Invalid configuration handling test in configuration.e2e.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Error Handling Verification (Priority: P3)

**Goal**: Verify error scenarios are handled gracefully with helpful messages

**Independent Test**: Trigger various error scenarios and validate error context and messages

### Implementation for User Story 3

- [ ] T031 [US3] Create test file e2e/scenarios/error-handling.e2e.ts with test suite structure
- [ ] T032 [US3] Implement Test 3.1: Invalid tool name error test in error-handling.e2e.ts
- [ ] T033 [US3] Implement Test 3.2: Invalid arguments error test in error-handling.e2e.ts
- [ ] T034 [US3] Implement Test 3.3: Downstream server failure error test in error-handling.e2e.ts
- [ ] T035 [US3] Implement Test 3.4: Configuration reference error test in error-handling.e2e.ts

**Checkpoint**: All error handling scenarios should now be validated

---

## Phase 6: User Story 4 - CI/CD Pipeline Integration (Priority: P4)

**Goal**: Run E2E tests automatically in CI/CD pipelines

**Independent Test**: Configure GitHub Actions workflow and verify tests run in CI

### Implementation for User Story 4

- [ ] T036 [US4] Create GitHub Actions workflow file .github/workflows/e2e-tests.yml
- [ ] T037 [US4] Configure workflow triggers (pull_request, push to main) in e2e-tests.yml
- [ ] T038 [US4] Add workflow steps (checkout, setup-node, install, build, test) in e2e-tests.yml
- [ ] T039 [US4] Create test file e2e/scenarios/ci-integration.e2e.ts for CI-specific validation
- [ ] T040 [US4] Implement Test 4.1: CI test execution validation in ci-integration.e2e.ts
- [ ] T041 [US4] Verify E2E tests appear as GitHub status checks on test PR

**Checkpoint**: All user stories should now be independently functional with CI integration

---

## Phase 7: Documentation & Cross-Cutting Concerns

**Purpose**: Documentation updates and final polish (MANDATORY per Core Principle VIII)

- [ ] T042 [P] Update README.md with E2E testing section (running tests locally, CI integration)
- [ ] T043 [P] Update CLAUDE.md with E2E test architecture and patterns documentation
- [ ] T044 Verify all E2E tests pass locally with npm run test:e2e
- [ ] T045 Verify E2E tests complete in under 5 minutes (per FR-011)
- [ ] T046 [P] Verify test output is pass/fail only (per clarifications - no performance metrics)
- [ ] T047 [P] Verify cleanup failures abort test run (per FR-006 and clarifications)
- [ ] T048 [P] Verify tests are deterministic (no flaky tests per SC-007)
- [ ] T049 Run quickstart.md validation (verify commands work as documented)
- [ ] T050 Final review: Ensure documentation matches implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Documentation (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 (tests different configs)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2 (tests error scenarios)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent but benefits from having US1-US3 tests to run in CI

### Within Each User Story

- All tests within a user story can be implemented sequentially
- Tests share the same helpers from Foundational phase
- Each test is independent within its scenario file
- Story complete when all tests pass independently

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T004, T006)
- All Foundational fixture tasks marked [P] can run in parallel (T010-T019)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Documentation tasks marked [P] can run in parallel (T042, T043, T046-T048)

---

## Parallel Example: Foundational Phase

```bash
# Launch all fixture creation tasks together (after T007-T011 helpers complete):
Task: "Create test fixture: valid-single-toolbox.json in e2e/fixtures/configs/"
Task: "Create test fixture: valid-multiple-toolboxes.json in e2e/fixtures/configs/"
Task: "Create test fixture: valid-with-env-vars.json in e2e/fixtures/configs/"
Task: "Create test fixture: valid-with-tool-filters.json in e2e/fixtures/configs/"
Task: "Create test fixture: invalid-missing-server.json in e2e/fixtures/configs/"
Task: "Create test fixture: invalid-bad-syntax.json in e2e/fixtures/configs/"
Task: "Create downstream server setup helpers in e2e/fixtures/downstream-servers/test-server-setup.ts"
Task: "Create expected tool schemas in e2e/fixtures/expected-responses/tool-schemas.ts"
```

---

## Parallel Example: User Stories (After Foundational Complete)

```bash
# If team has 4 developers, all user stories can proceed simultaneously:
Developer A: User Story 1 (T020-T025) - Workflow validation tests
Developer B: User Story 2 (T026-T030) - Configuration tests
Developer C: User Story 3 (T031-T035) - Error handling tests
Developer D: User Story 4 (T036-T041) - CI integration
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T019) - CRITICAL foundation
3. Complete Phase 3: User Story 1 (T020-T025)
4. Complete Phase 7: Documentation (T042-T050)
5. **STOP and VALIDATE**: Test User Story 1 independently
6. Deploy/demo if ready (validates complete workbench workflow E2E)

### Incremental Delivery

1. Complete Setup + Foundational (T001-T019) → Foundation ready
2. Add User Story 1 (T020-T025) + Docs → Test independently → Deploy/Demo (MVP - workflow validation!)
3. Add User Story 2 (T026-T030) + Docs → Test independently → Deploy/Demo (configuration testing added)
4. Add User Story 3 (T031-T035) + Docs → Test independently → Deploy/Demo (error handling validated)
5. Add User Story 4 (T036-T041) + Docs → Test independently → Deploy/Demo (CI integration complete)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T019)
2. Once Foundational is done:
   - Developer A: User Story 1 (T020-T025) - Workflow tests
   - Developer B: User Story 2 (T026-T030) - Config tests
   - Developer C: User Story 3 (T031-T035) - Error tests
   - Developer D: User Story 4 (T036-T041) - CI integration
3. Stories complete and integrate independently
4. Final documentation phase (T042-T050) done collaboratively

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **NO UNIT TESTS GENERATED**: Feature specification is about E2E tests themselves (tests ARE the deliverable)
- **Pass/fail output only** per clarifications (no performance metrics)
- **No automatic retries** - manual investigation only per clarifications
- **Cleanup failures abort run** per FR-006 and clarifications
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
