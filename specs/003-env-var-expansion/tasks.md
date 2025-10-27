---
description: "Task list for Environment Variable Expansion implementation"
---

# Tasks: Environment Variable Expansion in Configuration

**Input**: Design documents from `/specs/003-env-var-expansion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature uses manual testing with test configurations (not automated unit/integration tests). Test tasks create test configuration files and validation procedures.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. However, since this feature involves a shared expansion module, some foundational tasks support all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a single project structure:
- **Source**: `src/` at repository root
- **Tests**: `tests/config-expansion/` for test configurations
- All file paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test structure

- [X] T001 Create test directory structure at tests/config-expansion/
- [X] T002 [P] Add TypeScript type definitions for expansion in src/types.ts (if needed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core expansion module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create EnvExpansionError class in src/env-expander.ts with variable, jsonPath, and reason fields
- [X] T004 Implement expandString function in src/env-expander.ts with regex pattern `/\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g`
- [X] T005 Implement expandEnvVars recursive function in src/env-expander.ts handling strings, objects, arrays, primitives
- [X] T006 Add variable name validation in src/env-expander.ts (POSIX-compliant: `[A-Z_][A-Z0-9_]*`)
- [X] T007 Add error handling for missing required variables in src/env-expander.ts
- [X] T008 Add error handling for malformed syntax in src/env-expander.ts
- [X] T009 Integrate expandEnvVars in src/config-loader.ts before Zod validation
- [X] T010 Add EnvExpansionError handling in src/config-loader.ts with configuration file context

**Checkpoint**: Foundation ready - expansion module complete and integrated

---

## Phase 3: User Story 1 - Secure Credential Management (Priority: P1) 🎯 MVP

**Goal**: Enable developers to externalize sensitive credentials (API keys, passwords) using `${VAR}` syntax

**Independent Test**: Create a configuration with `${API_KEY}` in env field, set API_KEY environment variable, verify server receives expanded value without exposing secrets in config file

### Test Configuration for User Story 1

- [X] T011 [US1] Create tests/config-expansion/test-us1-credentials.json with `${API_KEY}` and `${DATABASE_PASSWORD}` references in env and args fields
- [X] T012 [US1] Document test procedure in tests/config-expansion/test-us1-credentials.md (set variables, run server, verify expansion, verify error when missing)

### Implementation for User Story 1

- [X] T013 [US1] Test expansion in `env` object values (FR-005) - verify `${API_KEY}` expands correctly
- [X] T014 [US1] Test expansion in `command` field (FR-003) - verify executable paths with variables work
- [X] T015 [US1] Test expansion in `args` array (FR-004) - verify `${DATABASE_PASSWORD}` in arguments works
- [X] T016 [US1] Test error message when required variable missing (FR-008) - verify clear error with variable name and location
- [X] T017 [US1] Test multiple variables in single config (acceptance scenario 3) - verify all expand correctly

**Checkpoint**: User Story 1 complete - Required variable syntax (`${VAR}`) works for credentials in all config fields

---

## Phase 4: User Story 2 - Cross-Platform Path Handling (Priority: P2)

**Goal**: Enable cross-platform configuration sharing with machine-specific paths using environment variables

**Independent Test**: Configure server with `${HOME}/path/to/server`, verify works on different machines with different HOME values

### Test Configuration for User Story 2

- [X] T018 [US2] Create tests/config-expansion/test-us2-paths.json with `${HOME}` and `${PROJECT_ROOT}` in command and args fields
- [X] T019 [US2] Document cross-platform test procedure in tests/config-expansion/test-us2-paths.md (test on macOS/Linux, verify path expansion)

### Implementation for User Story 2

- [X] T020 [US2] Test path expansion in command field (acceptance scenario 1) - verify `${HOME}/tools/server.js` expands correctly
- [X] T021 [US2] Test path expansion in args array (acceptance scenario 2) - verify `${PROJECT_ROOT}/config.json` works
- [X] T022 [US2] Test special characters in path values (edge case) - verify paths with spaces, colons work correctly
- [X] T023 [US2] Test empty string vs unset variables (edge case) - verify `export VAR=""` vs `unset VAR` handled correctly

**Checkpoint**: User Story 2 complete - Path variables work across different operating systems

---

## Phase 5: User Story 3 - Environment-Specific Configuration (Priority: P3)

**Goal**: Enable multi-environment configurations (dev/staging/prod) using same config structure with different variable values

**Independent Test**: Set different values for `${API_ENDPOINT}`, verify configuration adapts to different environments without file changes

### Test Configuration for User Story 3

- [ ] T024 [US3] Create tests/config-expansion/test-us3-multienv.json with `${API_ENDPOINT}` in url field and env-specific variables
- [ ] T025 [US3] Document multi-environment test procedure in tests/config-expansion/test-us3-multienv.md (test dev/prod environments)

### Implementation for User Story 3

- [ ] T026 [US3] Test expansion in `url` field for HTTP servers (FR-006) - verify `${API_ENDPOINT}` expands in URLs
- [ ] T027 [US3] Test expansion in `headers` object (FR-007) - verify authorization headers with `${AUTH_TOKEN}` work
- [ ] T028 [US3] Test multiple variables controlling different aspects (acceptance scenario 3) - verify URLs, credentials, settings all expand
- [ ] T029 [US3] Test environment switching without config changes (acceptance scenarios 1-2) - verify same config works with different variable values

**Checkpoint**: User Story 3 complete - Multi-environment configurations work dynamically

---

## Phase 6: User Story 4 - Default Values for Optional Settings (Priority: P3)

**Goal**: Enable configurations with fallback defaults using `${VAR:-default}` syntax for better out-of-box experience

**Independent Test**: Use `${LOG_LEVEL:-info}` in configuration, verify default used when unset, variable value used when set

### Test Configuration for User Story 4

- [ ] T030 [US4] Create tests/config-expansion/test-us4-defaults.json with `${LOG_LEVEL:-info}` and `${PORT:-3000}` using default syntax
- [ ] T031 [US4] Document default values test procedure in tests/config-expansion/test-us4-defaults.md (test with/without variables set)

### Implementation for User Story 4

- [ ] T032 [US4] Test default value syntax (FR-002) - verify `${LOG_LEVEL:-info}` uses "info" when LOG_LEVEL unset
- [ ] T033 [US4] Test environment variable override (acceptance scenario 2) - verify variable value takes precedence over default
- [ ] T034 [US4] Test multiple variables with mixed defaults (acceptance scenario 3) - verify some with defaults, some without
- [ ] T035 [US4] Test default value validation (FR-011) - verify defaults with unmatched braces fail gracefully
- [ ] T036 [US4] Verify empty string vs default behavior - ensure `export VAR=""` doesn't use default (empty is valid value)

**Checkpoint**: User Story 4 complete - Default value syntax works for optional settings

---

## Phase 7: Edge Cases & Error Handling

**Purpose**: Comprehensive testing of edge cases and error scenarios across all user stories

- [ ] T037 [P] Test malformed syntax errors - verify `${VAR` (unclosed brace) produces clear error message
- [ ] T038 [P] Test invalid variable names - verify `${123VAR}` and `${MY-VAR}` produce clear errors with naming rules
- [ ] T039 [P] Test multiple variables in single field (FR-010) - verify `${HOST}:${PORT}` expands both variables
- [ ] T040 [P] Test special characters in values - verify `export PASSWORD='p@$$w0rd!'` works correctly
- [ ] T041 [P] Test multi-line values - verify environment variables with newlines (certificates) work
- [ ] T042 [P] Test very long values - verify environment variables > 1KB work without performance issues
- [ ] T043 [P] Test backward compatibility - verify existing configs without env vars still work unchanged

**Checkpoint**: All edge cases handled, error messages are clear and actionable

---

## Phase 8: Documentation & Polish

**Purpose**: User-facing and developer documentation updates

- [ ] T044 [P] Update README.md with environment variable syntax section per quickstart.md Step 4
- [ ] T045 [P] Add configuration examples to README.md showing `${VAR}` and `${VAR:-default}` usage
- [ ] T046 [P] Add error handling documentation to README.md with example error messages
- [ ] T047 [P] Add security best practices section to README.md (never commit credentials, use env vars)
- [ ] T048 [P] Update CLAUDE.md with env-expander.ts architecture per quickstart.md Step 4
- [ ] T049 [P] Update CLAUDE.md Configuration as Contract section with expansion flow
- [ ] T050 [P] Add code comments in src/env-expander.ts explaining regex pattern and edge cases
- [ ] T051 [P] Create comprehensive test matrix document in tests/config-expansion/TEST_MATRIX.md
- [ ] T052 Performance validation - run benchmark from quickstart.md Step 6, verify < 10ms for typical configs
- [ ] T053 Create example configuration in repository root showing env var usage patterns

**Checkpoint**: All documentation complete, feature ready for code review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if team capacity allows)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Edge Cases (Phase 7)**: Depends on all user stories being complete (tests edge cases across all features)
- **Documentation (Phase 8)**: Depends on implementation complete - can run in parallel with Phase 7

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 (tests different config fields)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2 (tests url/headers fields)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories (tests default syntax)

**Key Insight**: All user stories are independent and can be implemented in parallel once foundational expansion module is complete. They test different aspects of the same underlying expansion mechanism.

### Within Each User Story

**Pattern**:
1. Create test configuration file (can run in parallel with other story test configs)
2. Document test procedure (can run in parallel with other story docs)
3. Run tests against expansion module (sequential within story, but parallel across stories)

### Parallel Opportunities

**Phase 1 (Setup)**: Both tasks can run in parallel
- T001 and T002 [P] - different concerns (directory vs types)

**Phase 2 (Foundational)**: Sequential within phase (each builds on previous)
- T003-T010 must run in order (error class → expansion logic → integration)

**Phase 3-6 (User Stories)**: MASSIVE parallelization opportunity
- Once Phase 2 complete, ALL user stories (Phases 3-6) can start simultaneously
- Within each story, test config creation tasks are parallel
- Test execution within each story is sequential (depends on foundational module)

**Phase 7 (Edge Cases)**: All edge case tests [P] can run in parallel
- T037-T043 all test different edge cases independently

**Phase 8 (Documentation)**: All documentation tasks [P] can run in parallel
- T044-T053 all update different files

---

## Parallel Example: After Foundational Phase

```bash
# Once Phase 2 complete, launch all user story work in parallel:

# User Story 1 (Developer A):
Task: "Create tests/config-expansion/test-us1-credentials.json"
Task: "Document test procedure in test-us1-credentials.md"
Task: "Test expansion in env object values"
# ... continue US1 tasks

# User Story 2 (Developer B):
Task: "Create tests/config-expansion/test-us2-paths.json"
Task: "Document test procedure in test-us2-paths.md"
Task: "Test path expansion in command field"
# ... continue US2 tasks

# User Story 3 (Developer C):
Task: "Create tests/config-expansion/test-us3-multienv.json"
Task: "Document test procedure in test-us3-multienv.md"
Task: "Test expansion in url field"
# ... continue US3 tasks

# User Story 4 (Developer D):
Task: "Create tests/config-expansion/test-us4-defaults.json"
Task: "Document test procedure in test-us4-defaults.md"
Task: "Test default value syntax"
# ... continue US4 tasks

# All stories converge when complete, then move to Phase 7 together
```

---

## Parallel Example: Documentation Phase

```bash
# All documentation tasks can run simultaneously:
Task: "Update README.md with environment variable syntax section"
Task: "Add configuration examples to README.md"
Task: "Update CLAUDE.md with env-expander.ts architecture"
Task: "Add code comments in src/env-expander.ts"
Task: "Create comprehensive test matrix document"
Task: "Create example configuration in repository root"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimum Viable Product - Fastest path to value**:

1. **Phase 1: Setup** (T001-T002) - 15 minutes
   - Create test directory
   - Add type definitions if needed

2. **Phase 2: Foundational** (T003-T010) - 2-3 hours
   - Build env-expander.ts module
   - Integrate with config-loader.ts
   - **CRITICAL CHECKPOINT**: Expansion module works

3. **Phase 3: User Story 1** (T011-T017) - 1-2 hours
   - Test credential expansion (`${API_KEY}`)
   - Verify error handling
   - **STOP and VALIDATE**: Security use case works

4. **Phase 8: Minimal Docs** (T044-T047) - 30 minutes
   - Update README.md with basic syntax
   - Add security best practices
   - **Deploy MVP**: Feature is usable for credentials

**Total MVP Time**: 4-6 hours
**Value Delivered**: Developers can externalize credentials safely (primary use case)

### Incremental Delivery (Full Feature)

**Build on MVP, add value incrementally**:

1. **MVP Complete** → Secure credential management works
2. **Add US2** (Phase 4: T018-T023) → Cross-platform paths work
3. **Add US3** (Phase 5: T024-T029) → Multi-environment configs work
4. **Add US4** (Phase 6: T030-T036) → Default values improve UX
5. **Add Edge Cases** (Phase 7: T037-T043) → Robust error handling
6. **Complete Docs** (Phase 8: T048-T053) → Full documentation

**Each increment**:
- Adds value without breaking previous functionality
- Can be tested independently
- Can be deployed when ready

### Parallel Team Strategy

**With 2-4 developers, maximize parallelism**:

**Day 1: Foundation (Together)**
- Team completes Phase 1 + 2 together (2-4 hours)
- **Checkpoint**: Expansion module working

**Day 1-2: User Stories (Parallel)**
- Developer A: US1 (credentials) - 1-2 hours
- Developer B: US2 (paths) - 1-2 hours
- Developer C: US3 (multi-env) - 1-2 hours
- Developer D: US4 (defaults) - 1-2 hours
- **Checkpoint**: All stories independently complete

**Day 2: Polish (Parallel)**
- Developer A: Edge cases (T037-T043) - 1 hour
- Developer B: README.md docs (T044-T047) - 30 min
- Developer C: CLAUDE.md docs (T048-T049) - 30 min
- Developer D: Test matrix + examples (T050-T053) - 1 hour

**Total Team Time**: 1-2 days (vs 4-6 hours solo for MVP)

---

## Task Summary

**Total Tasks**: 53
**Breakdown by Phase**:
- Phase 1 (Setup): 2 tasks
- Phase 2 (Foundational): 8 tasks (BLOCKS all user stories)
- Phase 3 (US1 - P1): 7 tasks
- Phase 4 (US2 - P2): 6 tasks
- Phase 5 (US3 - P3): 6 tasks
- Phase 6 (US4 - P3): 7 tasks
- Phase 7 (Edge Cases): 7 tasks
- Phase 8 (Documentation): 10 tasks

**Parallelizable Tasks**: 31 tasks marked [P]
**Sequential Tasks**: 22 tasks (dependencies within phases)

**User Story Task Distribution**:
- US1 (Secure Credentials): 7 tasks (2 test setup + 5 implementation/validation)
- US2 (Cross-Platform Paths): 6 tasks (2 test setup + 4 implementation/validation)
- US3 (Multi-Environment): 6 tasks (2 test setup + 4 implementation/validation)
- US4 (Default Values): 7 tasks (2 test setup + 5 implementation/validation)

**Independent Test Criteria Met**:
- ✅ Each user story has test configuration and validation procedure
- ✅ Each user story can be tested independently with its test config
- ✅ Each user story delivers value on its own (credentials, paths, multi-env, defaults)
- ✅ User stories are independent (can be implemented in any order after foundation)

**MVP Scope (Recommended)**:
- Phase 1 (Setup): T001-T002
- Phase 2 (Foundational): T003-T010
- Phase 3 (US1 only): T011-T017
- Phase 8 (Minimal docs): T044-T047
- **Total MVP Tasks**: 19 (4-6 hours)

---

## Notes

- **[P] tasks** = different files or independent testing, no dependencies between them
- **[Story] label** = maps task to specific user story for traceability and independent testing
- **Each user story** is independently completable and testable with its test configuration
- **Test configurations** are the primary testing mechanism (manual testing, not automated unit tests)
- **Validation procedures** documented per story enable independent verification
- **Stop at any checkpoint** to validate story independently before proceeding
- **Commit strategy**: Commit after each task or logical group of related tasks
- **Priority guideline**: Complete US1 (P1) first for MVP, then add US2-US4 incrementally
- **Avoid**: Cross-story dependencies that break independence; vague tasks without file paths

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 4 user stories independently testable with their test configurations
- [ ] US1 works: `${API_KEY}` expands in env/args/command fields
- [ ] US2 works: `${HOME}` paths expand on different platforms
- [ ] US3 works: `${API_ENDPOINT}` URLs expand in url/headers fields
- [ ] US4 works: `${VAR:-default}` defaults used when variables unset
- [ ] Error messages include variable name, JSON path, and resolution help
- [ ] Backward compatibility: existing configs without env vars work unchanged
- [ ] Performance: expansion completes in < 10ms for typical configs
- [ ] Documentation: README.md and CLAUDE.md updated per constitution requirements
- [ ] All edge cases tested: special chars, multi-line, empty strings, malformed syntax
- [ ] Constitution compliance: all 6 core principles satisfied (verified in plan.md)
