# Implementation Plan: Initialization Instructions for Toolboxes

**Branch**: `005-init-instructions-toolboxes` | **Date**: 2025-10-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-init-instructions-toolboxes/spec.md`

**Note**: This plan incorporates clarifications from `/speckit.clarify` session on 2025-10-28

## Summary

Replace the `workbench_list_toolboxes` meta-tool with initialization instructions that provide toolbox listings during the MCP initialization handshake. This eliminates an extra round-trip for clients and follows standard MCP patterns by including toolbox discovery information in the `instructions` field of the `initialize` response.

**Key Clarifications**:
- **Version Bump**: MINOR version (e.g., 0.8.0 → 0.9.0) despite tool removal
- **Migration**: Silent removal approach - assume low usage
- **Edge Cases**: Fail-fast on invalid config, no truncation for long descriptions, no special logging
- **Observability**: No special logging - simple pure function

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation
**Storage**: N/A (configuration is file-based JSON, no persistent storage)
**Testing**: Manual testing with real MCP servers (e.g., @modelcontextprotocol/server-memory)
**Target Platform**: Node.js server environment (CLI/daemon)
**Project Type**: Single project (TypeScript server application)
**Performance Goals**: Initialization response time increase <100ms compared to baseline
**Constraints**: Must support MCP specification initialization protocol, plain text format for instructions, MINOR version bump with silent removal
**Scale/Scope**: Small feature - modify initialization handler, remove 1 meta-tool, update 2-3 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Meta-Server Orchestration Pattern

**Status**: ⚠️ MODIFIED - Intentional Constitutional Change

**Evaluation**: This feature modifies the meta-tool count by removing `workbench_list_toolboxes`:
- Dynamic mode: Currently 2 tools, will become 1 tool (`workbench_open_toolbox`)
- Proxy mode: Currently 3 tools, will become 2 tools (`workbench_open_toolbox`, `workbench_use_tool`)

**Constitution Requirement**:
> MUST expose exactly 2 meta-tools in dynamic mode: `workbench_list_toolboxes`, `workbench_open_toolbox`
> MUST expose exactly 3 meta-tools in proxy mode: the above two plus `workbench_use_tool`

**Justification**: This is an **intentional constitutional change**. The feature replaces separate tool-based discovery with initialization-time discovery, which is more aligned with MCP patterns. The constitution will need to be updated to reflect the new meta-tool counts (1 for dynamic, 2 for proxy) as part of this feature.

**Clarification Impact**: User clarified this will be a **MINOR version bump** (not MAJOR), accepting that this violates semantic versioning for project simplicity. Silent removal approach with no migration warnings.

**Action Required**: Update constitution.md Principle I after implementation to reflect new meta-tool counts and discovery mechanism.

---

### II. Tool Naming and Conflict Resolution

**Status**: ✅ PASS

**Evaluation**: This feature does not affect tool naming patterns. Downstream tools will continue to use `{toolbox}__{server}__{tool}` naming. Only the meta-tool layer changes.

---

### III. Mode-Agnostic Tool Invocation

**Status**: ✅ PASS

**Evaluation**: Both dynamic and proxy modes will behave identically - toolbox information moves from tool response to initialization response. No changes to invocation patterns for downstream tools.

---

### IV. Configuration as Contract

**Status**: ✅ PASS

**Evaluation**: No configuration schema changes required. Toolbox discovery reads the same configuration, just exposes it via initialization instead of a tool.

**Clarification**: Invalid/missing configuration handled via fail-fast at startup (already existing behavior).

---

### V. Fail-Safe Error Handling

**Status**: ✅ PASS

**Evaluation**: Error handling patterns remain unchanged. Configuration validation at startup continues as before.

**Clarification**: No special logging needed for instructions generation - it's a pure function with errors caught at config load.

---

### VI. Release Policy and Workflow

**Status**: ⚠️ MODIFIED - Non-Standard Release Approach

**Evaluation**: Standard feature development workflow applies, BUT this will be released as a **MINOR version bump** (e.g., 0.8.0 → 0.9.0) despite removing a public meta-tool.

**Clarification**: User accepted this violates semantic versioning but chose this approach for simplicity. Silent removal with minimal migration communication.

---

### Quality Standards - Documentation Requirements

**Status**: ✅ PASS - Documentation Updates Required

**Mandatory Updates Required**:

**README.md** - Meta-tool removal triggers:
- Remove `workbench_list_toolboxes` from tool list
- Update usage examples to show initialization-based discovery
- Update meta-tool counts (2→1 dynamic, 3→2 proxy)
- **NO migration guide** (silent removal per clarification)

**CLAUDE.md** - Architecture change triggers:
- Update meta-server pattern section with new discovery mechanism
- Update initialization flow documentation
- Update meta-tool count in core principles reference

**Both Documents**:
- Reflect new discovery pattern (initialization vs tool-based)
- Update meta-tool enumeration throughout

---

### Summary

**Gate Result**: ⚠️ CONDITIONAL PASS

**Conditions**:
1. Constitution Principle I must be updated post-implementation to reflect new meta-tool counts
2. README.md and CLAUDE.md must be updated as part of this feature
3. This will be released as a **MINOR version** (0.8.0 → 0.9.0) accepting semver violation
4. **NO migration guide or deprecation warnings** (silent removal approach)

**Proceed to Phase 0**: ✅ YES - with understanding that this is an intentional constitutional amendment with non-standard versioning

## Project Structure

### Documentation (this feature)

```text
specs/005-init-instructions-toolboxes/
├── spec.md              # Feature specification (completed with clarifications)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (already exists, may need updates)
├── data-model.md        # Phase 1 output (already exists, may need updates)
├── quickstart.md        # Phase 1 output (already exists, needs updates for clarifications)
├── contracts/           # Phase 1 output (already exists) - MCP protocol schemas
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # MODIFY: Main MCP server (remove list_toolboxes tool, add instructions to init)
├── client-manager.ts    # NO CHANGE: Connection management unchanged
├── config-loader.ts     # NO CHANGE: Configuration loading unchanged
└── types.ts             # MODIFY: May need to add types for instructions field

README.md                # MODIFY: Update documentation (remove list_toolboxes, add initialization docs)
CLAUDE.md                # MODIFY: Update architecture docs (new discovery pattern)
.specify/memory/
└── constitution.md      # MODIFY: Update Principle I (meta-tool counts)
```

**Structure Decision**: Single project structure. This feature requires minimal changes - primarily modifying the initialization handler in [src/index.ts](../../src/index.ts) to generate instructions and removing the `workbench_list_toolboxes` tool registration. Documentation updates are more extensive than code changes due to the constitutional change.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Meta-tool count reduction (Principle I) | Eliminate redundant discovery mechanism, align with MCP patterns | Keeping both mechanisms would create confusion and maintenance burden; initialization-based discovery is the standard MCP approach |
| MINOR bump for breaking change (Principle VI) | Project simplicity and low usage assumption | Strict semver compliance would require MAJOR bump (0.8.0 → 1.0.0); user chose pragmatic approach |

## Clarification Summary

The following clarifications from `/speckit.clarify` session inform this plan:

1. **Version Strategy**: MINOR bump (0.8.0 → 0.9.0) - pragmatic over semver strict
2. **Migration Communication**: Silent removal - no deprecation warnings or migration guide
3. **Config Error Handling**: Fail-fast at startup (already existing behavior)
4. **Message Size Limits**: No truncation - assume reasonable description lengths
5. **Observability**: No special logging - pure function, errors at config load

These clarifications simplify the implementation and reduce scope compared to the original research assumptions.

## Notes

- Previous planning artifacts (research.md, data-model.md, contracts/, quickstart.md) were generated assuming MAJOR version bump
- These artifacts need minor updates to reflect MINOR bump and silent removal approach
- Constitution check reflects both the meta-tool change AND the non-standard versioning decision
