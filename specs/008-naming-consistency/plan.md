# Implementation Plan: Standardize Parameter and Field Naming

**Branch**: `008-naming-consistency` | **Date**: 2025-10-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-naming-consistency/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Standardize parameter and field naming across the MCP Workbench codebase to use only `toolbox`, `server`, and `tool` instead of inconsistent variations (`toolbox_name`, `source_server`, `name`, `original_name`). This refactoring improves API consistency, reduces cognitive overhead for developers, and makes the codebase more maintainable. The change is a breaking change affecting meta-tool parameters, type definitions, and tool metadata structures but does not require new functionality or architecture changes.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8
**Storage**: N/A (in-memory state management only)
**Testing**: Manual testing with test MCP servers (e.g., @modelcontextprotocol/server-memory)
**Target Platform**: Node.js runtime (Linux, macOS, Windows)
**Project Type**: Single (MCP server library)
**Performance Goals**: N/A (refactoring, no performance changes expected)
**Constraints**: Breaking change requiring major version bump (pre-1.0.0 incubation allows relaxed semver)
**Scale/Scope**: 3 source files affected (src/types.ts, src/index.ts, src/client-manager.ts), documentation files (CLAUDE.md, README.md)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle II: Tool Naming and Conflict Resolution

**Current State**: The constitution (v1.8.0) states that tool metadata MUST include separate `toolbox_name`, `source_server`, and `name` fields. However, this is inconsistent with the structured tool identifier format that uses `toolbox`, `server`, and `tool`.

**Required Action**: This feature will update the constitution to standardize on `toolbox`, `server`, and `tool` everywhere, eliminating the inconsistency between ToolIdentifier and ToolInfo field names.

**Gate Status**: ⚠️ **REQUIRES CONSTITUTION AMENDMENT** - The constitution principle II currently specifies `toolbox_name`, `source_server`, and `name` but this conflicts with the ToolIdentifier structure. This amendment will be part of the implementation.

### Principle III: Proxy-Based Tool Invocation

**Current State**: Tool metadata uses separate fields but naming is inconsistent with tool identifiers.

**Required Action**: Update tool metadata structure to use standardized field names while maintaining the separate field pattern (not concatenated strings).

**Gate Status**: ✅ **COMPLIANT** - The change maintains separate fields as required, only standardizing the naming.

### Principle VI: Release Policy and Workflow

**Current State**: This is a breaking change to public API (meta-tool parameters and return types).

**Required Action**: During incubation (pre-1.0.0), breaking changes are permitted without migration guides. This change will require a version bump per the relaxed semver policy.

**Gate Status**: ✅ **COMPLIANT** - Breaking change is acceptable during incubation phase per Principle VII.

### Principle VII: Incubation Stage Policy

**Current State**: Project is at v0.11.1, in incubation stage.

**Required Action**: Follow relaxed semver - this breaking change can be released as minor or patch version increment during incubation.

**Gate Status**: ✅ **COMPLIANT** - Fast iteration prioritized during incubation, backward compatibility not required.

### Quality Standards: Mandatory Documentation Updates

**Required Documentation Updates**:
- ✅ README.md - Update all examples showing tool metadata and parameters
- ✅ CLAUDE.md - Update type definitions documentation and tool naming convention sections
- ✅ Constitution v1.8.0 → v1.9.0 - Amend Principle II to use standardized names

**Gate Status**: ✅ **COMPLIANT** - All required documentation updates identified and will be completed.

### Overall Gate Status: ⚠️ **BLOCKED** - Constitution amendment required before implementation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── types.ts              # Type definitions - Update ToolInfo interface
├── index.ts              # Main server - Update meta-tool parameter schemas
├── client-manager.ts     # Client manager - Update tool metadata building
├── config-loader.ts      # (No changes required)
└── env-expander.ts       # (No changes required)

.specify/
└── memory/
    └── constitution.md   # Update Principle II to use standardized names

README.md                 # Update all examples with new parameter names
CLAUDE.md                 # Update type system documentation and examples
```

**Structure Decision**: Single project structure. This is a refactoring that touches type definitions, meta-tool implementations, and documentation. No new files will be created, only existing files will be modified to use consistent naming.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Constitution Principle II specifies `toolbox_name`, `source_server`, `name` | Naming inconsistency creates API confusion and developer friction | Keeping inconsistent names would perpetuate the problem and conflict with ToolIdentifier structure already using `toolbox`, `server`, `tool` |

**Resolution**: This violation will be resolved by amending the constitution (v1.8.0 → v1.9.0) to use standardized field names throughout Principle II. The amendment is justified because it corrects an inconsistency introduced in earlier versions and aligns all naming with the structured tool identifier format.

---

## Post-Design Constitution Re-Check

*Performed after Phase 1 design artifacts complete.*

### Principle II: Tool Naming and Conflict Resolution

**Post-Design Status**: ✅ **RESOLVED**

**Resolution Plan Confirmed**:
- Constitution will be amended (v1.8.0 → v1.9.0) as part of implementation
- Principle II updated to specify `toolbox`, `server`, and `tool` fields
- All documentation references updated to match
- Change documented in Sync Impact Report

**Remaining Actions**: Execute constitution amendment during implementation (Step 5 in quickstart.md)

### Principle III: Proxy-Based Tool Invocation

**Post-Design Status**: ✅ **COMPLIANT**

- Design maintains separate fields (not concatenated strings) as required
- Tool metadata structure unchanged (only field names updated)
- Proxy invocation pattern unaffected

### Principle VI & VII: Release Policy and Incubation

**Post-Design Status**: ✅ **COMPLIANT**

- Breaking change confirmed acceptable during incubation
- No migration guide required per incubation policy
- Version bump will follow relaxed semver (0.11.1 → 0.12.0)
- CHANGELOG.md entry will document breaking changes

### Quality Standards: Documentation Updates

**Post-Design Status**: ✅ **COMPLIANT**

All required documentation updates identified and planned:
- ✅ README.md - Examples updated in quickstart (Step 4)
- ✅ CLAUDE.md - Architecture docs updated in quickstart (Step 4)
- ✅ Constitution - Amendment procedure documented in quickstart (Step 5)
- ✅ Contracts - API schema changes documented in [contracts/meta-tools.md](contracts/meta-tools.md)

### Overall Gate Status: ✅ **APPROVED FOR IMPLEMENTATION**

All constitution violations resolved by design. Implementation can proceed following the quickstart guide.
