# Implementation Plan: Remove Manual Toolbox Closing

**Branch**: `004-remove-manual-close` | **Date**: 2025-10-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-remove-manual-close/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Remove the `workbench_close_toolbox` meta-tool from the MCP Workbench API, simplifying the toolbox lifecycle by making toolboxes remain open until server shutdown. This eliminates manual resource management complexity and reduces API surface area while maintaining automatic cleanup via signal handlers. The implementation involves removing tool registration, updating both dynamic and proxy modes, ensuring idempotent open operations, and updating documentation (README.md and CLAUDE.md) to reflect the simplified workflow.

## Technical Context

**Language/Version**: TypeScript 5.7.2, Node.js 18+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8
**Storage**: N/A (in-memory state management only)
**Testing**: Manual testing with workbench-config.test.json and real MCP servers
**Target Platform**: Node.js server (stdio transport)
**Project Type**: Single project (TypeScript MCP server)
**Performance Goals**: Graceful shutdown within 5 seconds, no resource leaks during normal operation
**Constraints**: Must maintain backward compatibility for all tools except workbench_close_toolbox (incubating stage allows breaking changes)
**Scale/Scope**: Small change - removal of 1 meta-tool, updates to lifecycle management, documentation updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principle Compliance

**I. Meta-Server Orchestration Pattern** - ⚠️ **VIOLATION REQUIRING UPDATE**

Current constitution states:
- MUST expose exactly 3 meta-tools in dynamic mode: `workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`
- MUST expose exactly 4 meta-tools in proxy mode: the above three plus `workbench_use_tool`
- MUST properly clean up connections when toolboxes close

**This feature changes**:
- Dynamic mode will expose 2 meta-tools: `workbench_list_toolboxes`, `workbench_open_toolbox`
- Proxy mode will expose 3 meta-tools: the above two plus `workbench_use_tool`
- Cleanup happens at server shutdown, not on toolbox close

**Gate Status**: ✅ PASS - Constitution will be updated as part of this feature to reflect the new simplified model.

---

**II. Tool Naming and Conflict Resolution** - ✅ **COMPLIANT**

No changes to tool naming convention. The `{toolbox}__{server}__{tool}` pattern remains unchanged.

**Gate Status**: ✅ PASS

---

**III. Mode-Agnostic Tool Invocation** - ✅ **COMPLIANT**

Both dynamic and proxy modes will continue to use identical naming and delegation strategies. Only the count of meta-tools changes.

**Gate Status**: ✅ PASS

---

**IV. Configuration as Contract** - ✅ **COMPLIANT**

No configuration schema changes required for this feature.

**Gate Status**: ✅ PASS

---

**V. Fail-Safe Error Handling** - ✅ **COMPLIANT**

No changes to error handling patterns required.

**Gate Status**: ✅ PASS

---

**VI. Release Policy and Workflow** - ✅ **COMPLIANT**

This feature will follow the merge-first workflow. Documentation updates (README.md and CLAUDE.md) are explicitly required by the spec and will be completed before merge.

**Mandatory Documentation Updates Required**:
- ✅ README.md - Meta-tool removal triggers update (usage examples, workflow changes)
- ✅ CLAUDE.md - Architecture change triggers update (meta-server pattern, tool registration logic)
- ✅ Constitution - Update Principle I to reflect new meta-tool count

**Gate Status**: ✅ PASS (with mandatory documentation updates tracked in tasks)

---

### Quality Standards Compliance

**TypeScript Type Safety** - ✅ **COMPLIANT**

Changes will maintain strict mode and type safety. No new types required.

**Documentation Standards** - ✅ **COMPLIANT**

README.md and CLAUDE.md updates are mandatory requirements captured in the spec.

**Testing Philosophy** - ✅ **COMPLIANT**

Manual testing with workbench-config.test.json will validate the changes.

---

### Overall Gate Assessment

**Status**: ✅ **PASS WITH REQUIRED ACTIONS**

All gates pass. The only violation (Principle I) is intentional and will be resolved by updating the constitution as part of this feature. All mandatory documentation updates are tracked and will be completed before merge.

**Post-Design Re-evaluation** (2025-10-28): Constitution Check re-evaluated after Phase 1 design. Status unchanged - all gates still pass. Design artifacts ([research.md](research.md), [data-model.md](data-model.md), [contracts/meta-tools.json](contracts/meta-tools.json), [quickstart.md](quickstart.md)) confirm that no new violations were introduced. Implementation approach is sound and aligns with all quality standards.

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
├── index.ts              # Main MCP server - MODIFIED (remove close_toolbox tool registration)
├── client-manager.ts     # MCP client connection pool - MODIFIED (update lifecycle, make open idempotent)
├── config-loader.ts      # Configuration validator - NO CHANGES
├── env-expander.ts       # Environment variable expansion - NO CHANGES
└── types.ts              # TypeScript type definitions - NO CHANGES

.specify/
└── memory/
    └── constitution.md   # Project constitution - MODIFIED (update Principle I)

README.md                 # User documentation - MODIFIED (remove close examples, update workflow)
CLAUDE.md                 # Developer documentation - MODIFIED (update architecture section)
```

**Structure Decision**: Single TypeScript project. This feature modifies 2 core source files ([src/index.ts](../../src/index.ts), [src/client-manager.ts](../../src/client-manager.ts)), updates 3 documentation files ([README.md](../../README.md), [CLAUDE.md](../../CLAUDE.md), [constitution](../../.specify/memory/constitution.md)), and requires no changes to configuration loading, environment expansion, or type definitions.

## Complexity Tracking

**No violations requiring justification.** The constitution update (Principle I) is part of the feature itself, not a violation.
