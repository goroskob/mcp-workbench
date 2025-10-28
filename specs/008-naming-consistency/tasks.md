# Implementation Tasks: Standardize Parameter and Field Naming

**Feature**: 008-naming-consistency
**Branch**: `008-naming-consistency`
**Generated**: 2025-10-28
**Estimated Total Time**: 2-3 hours

## Overview

This document contains the actionable implementation tasks for standardizing parameter and field naming across the MCP Workbench codebase. The refactoring updates all occurrences of `toolbox_name`, `source_server`, and `name` to use consistent names: `toolbox`, `server`, and `tool`.

**Implementation Strategy**: This is a refactoring feature with no user stories requiring new functionality. All tasks are organized into Setup, Core Implementation, Documentation, and Validation phases. The changes are interdependent (type changes affect all usages), so parallelization opportunities are limited to documentation tasks.

---

## Task Summary

**Total Tasks**: 18
**Estimated Time**: 2-3 hours

### Tasks by Phase
- **Phase 1 - Setup**: 2 tasks (~10 minutes)
- **Phase 2 - Core Implementation (US1)**: 6 tasks (~50 minutes)
- **Phase 3 - Documentation (US3)**: 5 tasks (~50 minutes)
- **Phase 4 - Constitution & Polish**: 3 tasks (~30 minutes)
- **Phase 5 - Validation & Release**: 2 tasks (~10 minutes)

### Parallelization Opportunities
- 4 parallel tasks identified (marked with [P])
- Documentation updates can run in parallel after core implementation

---

## Dependencies

### Story Completion Order

```text
Phase 1: Setup
    ↓
Phase 2: Core Implementation (US1 - API Consumer Clarity)
    ├──→ Phase 3: Documentation (US3 - Documentation Accuracy) [Can partially overlap]
    └──→ Phase 4: Constitution & Polish
         ↓
Phase 5: Validation & Release
```

**Critical Path**: Setup → Core Implementation → Constitution → Validation
**Parallel Work**: Documentation tasks can begin after core type changes (T003) complete

---

## Phase 1: Setup

**Goal**: Prepare development environment and verify prerequisites.

**Duration**: ~10 minutes

### Tasks

- [X] T001 Verify clean git working directory with no uncommitted changes
- [X] T002 Verify Node.js 18+ installed and TypeScript 5.7.2 available via `npm run build`

---

## Phase 2: Core Implementation - User Story 1 (API Consumer Clarity)

**Story**: P1 - API Consumer Clarity
**Goal**: Update all API signatures and type definitions to use standardized naming (`toolbox`, `server`, `tool`)

**Why P1**: This is the foundation for a good developer experience. Without consistent naming, every API interaction becomes a source of frustration and bugs. This affects all users immediately and blocks efficient adoption.

**Independent Test**: TypeScript compilation succeeds and all references use exactly `toolbox`, `server`, and `tool` without variations.

**Duration**: ~50 minutes

### Tasks

- [X] T003 [US1] Update ToolInfo interface in src/types.ts: rename `source_server` → `server` and `toolbox_name` → `toolbox`
- [X] T004 [US1] Update JSDoc comments in src/types.ts to reference new field names (`server`, `toolbox`)
- [X] T005 [US1] Update open_toolbox Zod schema in src/index.ts: rename parameter `toolbox_name` → `toolbox`
- [X] T006 [US1] Update all usages of `params.toolbox_name` to `params.toolbox` in src/index.ts (expected 3-4 occurrences)
- [X] T007 [US1] Update tool description text in src/index.ts to reference `toolbox` parameter instead of `toolbox_name`
- [X] T008 [US1] Update tool metadata building in src/client-manager.ts: change `source_server: serverName` → `server: serverName` and `toolbox_name: toolboxName` → `toolbox: toolboxName`

**Acceptance Criteria**:
- ✅ `npm run build` compiles without TypeScript errors
- ✅ ToolInfo interface uses `server` and `toolbox` fields
- ✅ Meta-tool parameter schema uses `toolbox` (not `toolbox_name`)
- ✅ All internal usages reference new field names

---

## Phase 3: Documentation - User Story 3 (Documentation Accuracy)

**Story**: P3 - Documentation Accuracy
**Goal**: Update all documentation examples and references to use standardized naming

**Why P3**: Documentation can be manually verified after code changes are complete. It's important for onboarding and reference, but doesn't block functionality.

**Independent Test**: Search for old field names (`toolbox_name`, `source_server`) in README.md and CLAUDE.md returns zero results. All examples use standardized names.

**Duration**: ~50 minutes

### Tasks

- [X] T009 [P] [US3] Update all open_toolbox examples in README.md to use `toolbox` parameter (not `toolbox_name`)
- [X] T010 [P] [US3] Update all tool metadata examples in README.md to use `server` and `toolbox` fields
- [X] T011 [P] [US3] Update Tool Naming and Conflict Resolution section in CLAUDE.md with new field names
- [X] T012 [P] [US3] Update type system documentation in CLAUDE.md showing ToolInfo interface with standardized fields
- [X] T013 [US3] Search and update all code examples in CLAUDE.md that reference field names (`toolbox_name` → `toolbox`, `source_server` → `server`)

**Acceptance Criteria**:
- ✅ `grep -r "toolbox_name" README.md CLAUDE.md` returns zero results
- ✅ `grep -r "source_server" README.md CLAUDE.md` returns zero results
- ✅ All examples show consistent use of `toolbox`, `server`, `tool`

**Note**: Tasks T009-T012 marked [P] can run in parallel after T003 completes, as they operate on different files.

---

## Phase 4: Constitution & Polish

**Goal**: Amend constitution to document new standard and prepare for release

**Duration**: ~30 minutes

### Tasks

- [X] T014 Update Sync Impact Report in .specify/memory/constitution.md: increment version 1.8.0 → 1.9.0, add "Modified Principles" entry for Principle II
- [X] T015 Update Principle II in .specify/memory/constitution.md: change "Tool metadata MUST include separate `toolbox_name`, `source_server`, and `name` fields" → "Tool metadata MUST include separate `toolbox`, `server`, and `tool` fields"
- [X] T016 Update version footer and Last Amended date in .specify/memory/constitution.md to v1.9.0 and 2025-10-28

**Acceptance Criteria**:
- ✅ Constitution version updated to 1.9.0
- ✅ Principle II reflects standardized field names
- ✅ Sync Impact Report documents the amendment

---

## Phase 5: Validation & Release Prep

**Goal**: Verify all changes are complete and prepare for release

**Duration**: ~10 minutes

### Tasks

- [X] T017 Run validation searches: verify `grep -r "toolbox_name" src/` and `grep -r "source_server" src/` return zero results
- [X] T018 Run `npm run clean && npm run build` and verify clean compilation with no TypeScript errors

**Acceptance Criteria**:
- ✅ No occurrences of old field names in source code
- ✅ Clean TypeScript compilation
- ✅ Ready for manual testing and release

---

## Parallel Execution Examples

### After T003 Completes (Type Changes)

These tasks can run in parallel as they operate on different files:

```bash
# Terminal 1: Update README.md examples
[T009] Update open_toolbox examples
[T010] Update tool metadata examples

# Terminal 2: Update CLAUDE.md sections
[T011] Update Tool Naming section
[T012] Update type system docs

# Terminal 3: Update constitution
[T014] Update Sync Impact Report
```

**Benefit**: Saves ~20 minutes by parallelizing documentation updates

---

## Manual Testing (Post-Implementation)

After completing all implementation tasks, perform manual testing:

1. **Start Server**:
   ```bash
   export WORKBENCH_CONFIG=./workbench-config.test.json
   npm start
   ```

2. **Test open_toolbox**:
   - Call with new parameter: `{"toolbox": "test"}`
   - Verify response uses `server` and `toolbox` fields
   - Confirm no errors about missing `toolbox_name`

3. **Test use_tool**:
   - Call with ToolIdentifier structure (already correct)
   - Verify delegation still works
   - Confirm tool invocation succeeds

4. **Verify Error Messages**:
   - Call open_toolbox with invalid toolbox
   - Confirm error message uses "toolbox" terminology

---

## Release Checklist

After implementation and testing:

- [ ] Update package.json version: 0.11.1 → 0.12.0
- [ ] Create CHANGELOG.md entry documenting breaking changes
- [ ] Commit with conventional commit format: `feat!: standardize parameter and field naming`
- [ ] Create PR against main branch
- [ ] Merge after code review
- [ ] Tag release from main: `git tag v0.12.0`
- [ ] Push tag to trigger automated release workflow

---

## Success Metrics

**From Spec Success Criteria**:

- **SC-001**: Zero occurrences of `toolbox_name`, `source_server`, or `name` (in tool identification context) remain in the public API surface
  - **Validated by**: T017 (grep validation)

- **SC-002**: 100% of TypeScript type definitions use standardized field names (`toolbox`, `server`, `tool`)
  - **Validated by**: T003, T004 (ToolInfo interface update)

- **SC-003**: All documentation examples compile and run successfully with standardized parameter names
  - **Validated by**: T009-T013 (documentation updates) + manual testing

- **SC-004**: Code reviewers can verify naming consistency by searching for deprecated patterns and finding zero results
  - **Validated by**: T017 (grep validation)

---

## Notes

- **No User Story 2 Phase**: User Story 2 (Code Maintainability) is satisfied by the same implementation that satisfies User Story 1. There are no separate tasks required.
- **Breaking Change**: This is a breaking change acceptable during incubation (pre-1.0.0) per Constitution Principle VII
- **No Migration Guide**: Not required during incubation phase
- **Constitution Amendment**: Required as part of implementation (Principle II update)
- **Estimated Effort**: 2-3 hours total for complete implementation and testing
