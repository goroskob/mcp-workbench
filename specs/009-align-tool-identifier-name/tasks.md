# Implementation Tasks: Align Tool Identifier Property with MCP SDK Naming

**Feature**: 009-align-tool-identifier-name
**Branch**: `009-align-tool-identifier-name`
**Created**: 2025-10-28
**Total Tasks**: 15

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other [P] tasks in same phase)
- `[US#]` = User Story number (US1, US2, etc.)
- Task IDs: T001, T002, T003... (sequential execution order)

## Overview

This feature renames the `tool` property to `name` in the structured tool identifier to align with MCP SDK naming conventions. Implementation is organized by user story to enable independent testing and incremental delivery.

**User Stories**:
- **US1 (P1)**: Consistent API Naming with MCP SDK - Core schema and code changes
- **US2 (P2)**: Reduced Cognitive Overhead - Documentation alignment across all materials

**MVP Scope**: User Story 1 (US1) - delivers immediate API consistency with MCP SDK

## Dependencies Between User Stories

```
US1 (Core API Changes) → US2 (Documentation Updates)
```

**Explanation**:
- US1 must complete first (schema and code changes)
- US2 depends on US1 completion (documents the new API structure)
- Both stories together deliver complete feature

## Phase 1: Setup & Prerequisites

**Goal**: Verify environment and project state before implementation

**Duration**: ~5 minutes

### Tasks

- [X] T001 Verify git branch is 009-align-tool-identifier-name and working directory is clean
- [X] T002 Run `npm run build` to ensure project compiles cleanly before changes
- [X] T003 Verify Node.js version is 18+ and TypeScript 5.7.2 is installed

**Acceptance Criteria**:
- ✅ Git status shows clean working directory on correct branch
- ✅ TypeScript compilation succeeds with zero errors
- ✅ Development environment ready for implementation

## Phase 2: User Story 1 - Consistent API Naming with MCP SDK (P1)

**Story Goal**: Update the structured tool identifier schema and implementation to use `name` property instead of `tool`, matching MCP SDK Tool interface naming

**Independent Test**: Schema validation accepts `{ toolbox, server, name }` and rejects `{ toolbox, server, tool }`, all code references use `name`, error messages reference `name`

**Why This Story**: Delivers immediate API consistency with MCP SDK standards, enabling MCP-familiar developers to use intuitive property names

**Duration**: ~15 minutes

### Tasks

- [X] T004 [US1] Update ToolIdentifierSchema in src/index.ts line 35: rename `tool` property to `name`
- [X] T005 [US1] Update use_tool handler in src/index.ts line 338: change extraction to `const { toolbox, server, name } = params.tool;`
- [X] T006 [US1] Update findToolInToolbox call in src/index.ts lines 341-345: pass `name` instead of `tool` as third argument
- [X] T007 [US1] Update callTool delegation in src/index.ts line 349: change `name: tool` to `name: name` (or use shorthand `name`)
- [X] T008 [US1] Update error message in src/index.ts line 359: change `params.tool.tool` to `params.tool.name`
- [X] T009 [US1] Update use_tool inline documentation in src/index.ts lines 276-306: change all references from `tool` field to `name` field in structured identifier contexts
- [X] T010 [US1] Run `npm run build` and verify TypeScript compilation succeeds with zero errors

**Acceptance Criteria**:
- ✅ ToolIdentifierSchema uses `name` property (not `tool`)
- ✅ All code accessing structured identifier uses `params.tool.name` (not `params.tool.tool`)
- ✅ Error messages reference `name` field correctly
- ✅ Inline tool documentation shows `{ toolbox, server, name }` format
- ✅ TypeScript compilation succeeds
- ✅ Schema validation rejects old `tool` property with clear error

**Testing US1 Independently**:
```bash
# Verify schema change
grep -n "name: z.string().min(1" src/index.ts  # Should find updated schema

# Verify no old references remain
grep -n "params.tool.tool" src/index.ts  # Should return zero results

# Test compilation
npm run build  # Should succeed with no errors

# Manual runtime test (requires workbench running)
# Attempt tool invocation with new property - should succeed
# Attempt tool invocation with old property - should fail with clear error
```

## Phase 3: User Story 2 - Reduced Cognitive Overhead (P2)

**Story Goal**: Update all documentation to consistently reference `name` property in structured tool identifier contexts, ensuring developers see aligned naming across all materials

**Independent Test**: README.md, CLAUDE.md, and constitution all show `{ toolbox, server, name }` format with zero occurrences of `{ toolbox, server, tool }` in structured identifier contexts

**Why This Story**: Completes the alignment by ensuring documentation matches implementation, reducing cognitive load for developers reading docs

**Duration**: ~15 minutes

**Depends On**: US1 must be complete (documentation describes the implemented API)

### Tasks

- [X] T011 [US2] Search and update README.md: replace all `{ toolbox, server, tool }` with `{ toolbox, server, name }` in structured identifier examples
- [X] T012 [US2] Search and update CLAUDE.md: replace all structured identifier references from `tool` field to `name` field in type system documentation
- [X] T013 [US2] Update constitution .specify/memory/constitution.md Principle II (lines 48-58): change examples from `{ toolbox, server, tool }` to `{ toolbox, server, name }`
- [X] T014 [US2] Update constitution .specify/memory/constitution.md: bump version to 1.10.0 and update Sync Impact Report at top of file

**Acceptance Criteria**:
- ✅ README.md examples show `{ toolbox, server, name }` format
- ✅ CLAUDE.md type documentation references `name` property
- ✅ Constitution Principle II updated with new format
- ✅ Constitution version bumped to 1.10.0
- ✅ Zero occurrences of old format in documentation (except historical references)

**Testing US2 Independently**:
```bash
# Verify documentation updates
grep -n "{ toolbox, server, tool }" README.md CLAUDE.md  # Should return zero results
grep -n "{ toolbox, server, name }" README.md CLAUDE.md  # Should find updated examples

# Verify constitution update
grep -n "Version.*1.10.0" .specify/memory/constitution.md  # Should find version bump
grep -n "{ toolbox, server, name }" .specify/memory/constitution.md  # Should find in Principle II
```

## Phase 4: Validation & Polish

**Goal**: Verify complete implementation and prepare for release

**Duration**: ~10 minutes

### Tasks

- [X] T015 Run validation: `grep -r "params\.tool\.tool" src/` should return zero results, confirming all old references removed

**Acceptance Criteria**:
- ✅ Zero occurrences of `params.tool.tool` in src/ directory
- ✅ Zero occurrences of `{ toolbox, server, tool }` format in active code/docs (excluding historical)
- ✅ Clean TypeScript compilation
- ✅ Ready for commit and release

---

## Parallel Execution Opportunities

### Within User Story 1 (US1)
All US1 tasks (T004-T010) must run **sequentially** because:
- Schema change (T004) affects validation
- Code changes (T005-T008) depend on schema being correct
- Documentation (T009) describes the code changes
- Compilation (T010) validates all changes

**No parallelization possible within US1** - changes are tightly coupled.

### Within User Story 2 (US2)
Tasks T011-T013 can run in **parallel** if desired (different files, no dependencies):

**Parallel Batch 1** (documentation files):
```bash
# Terminal 1
# T011: Update README.md examples

# Terminal 2
# T012: Update CLAUDE.md type docs

# Terminal 3
# T013: Update constitution Principle II
```

Then **sequentially**:
- T014: Constitution version bump (must follow T013)

### Cross-Story Parallelization
**NOT POSSIBLE** - US2 depends on US1 completion. Must implement US1 first, then US2.

## Implementation Strategy

### MVP Delivery (US1 Only)
For minimum viable product, implement **only User Story 1**:
- Delivers core API change with MCP SDK alignment
- Provides immediate value to MCP-familiar developers
- Breaking change is functional
- Documentation can follow in separate iteration

**MVP Tasks**: T001-T010 (Setup + US1)

### Full Feature (US1 + US2)
For complete feature delivery:
- Implement US1 first (core API changes)
- Then implement US2 (documentation alignment)
- Ensures code and docs stay in sync

**Full Tasks**: T001-T015 (all phases)

### Incremental Testing
- After US1: Test schema validation and error messages
- After US2: Verify documentation accuracy
- Final validation before commit

## Release Checklist

After completing all tasks:

- [ ] All 15 tasks marked complete
- [ ] `npm run clean && npm run build` succeeds
- [ ] Manual testing with actual tool invocation passes
- [ ] New property `name` works correctly
- [ ] Old property `tool` fails with clear Zod error
- [ ] Error messages reference `name` correctly
- [ ] Documentation examples accurate
- [ ] Constitution amended to v1.10.0
- [ ] Ready for commit with breaking change notation (`feat!:`)
- [ ] Version bump to 0.13.0 planned

## Success Metrics

### User Story 1 Success Criteria
- ✅ SC-001: Zero occurrences of `tool` property in ToolIdentifierSchema
- ✅ SC-002: All code references use `params.tool.name` consistently
- ✅ Schema validation rejects old property with clear error

### User Story 2 Success Criteria
- ✅ SC-003: Documentation shows `{ toolbox, server, name }` format consistently
- ✅ SC-004: MCP-familiar developers can use identifier without documentation lookup

### Overall Feature Success
- ✅ Breaking change implemented cleanly
- ✅ API aligns with MCP SDK Tool interface naming
- ✅ Code and documentation synchronized
- ✅ Constitution principles updated

## References

- Feature Spec: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- Research Decisions: [research.md](./research.md)
- Data Model: [data-model.md](./data-model.md)
- API Contracts: [contracts/meta-tools.md](./contracts/meta-tools.md)
- Quickstart Guide: [quickstart.md](./quickstart.md)
