# Implementation Plan: Support Multiple Toolboxes with Duplicate Tools

**Branch**: `001-duplicate-tools-support` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-duplicate-tools-support/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable the MCP Workbench to support multiple toolboxes containing duplicate MCP server instances and tools. Currently, the workbench fails when opening a second toolbox that contains the same server/tool configurations. The solution will extend the existing tool naming convention from `{server}_{tool}` to `{toolbox}__{server}_{tool}`, allowing multiple instances of the same server to coexist with unique, addressable tools. This will maintain separate connection instances per toolbox while ensuring independent lifecycle management and proper tool routing in both dynamic and proxy modes.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation
**Storage**: In-memory state management (no persistent storage required)
**Testing**: Manual testing with real MCP servers (@modelcontextprotocol/server-memory, server-filesystem)
**Target Platform**: Node.js server (Linux/macOS/Windows), distributed as npm package
**Project Type**: Single TypeScript project (MCP server)
**Performance Goals**: <100ms toolbox open/close operations, <50ms tool routing overhead
**Constraints**: Must maintain backward compatibility with existing tool naming in single-toolbox scenarios; must not break existing configurations
**Scale/Scope**: Support 10+ concurrent toolboxes, each with 5+ servers, totaling 100+ registered tools without performance degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Meta-Server Orchestration Pattern

✅ **PASS** - This feature enhances the existing meta-server pattern:
- No change to the 3 meta-tools in dynamic mode (`workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`)
- No change to the 4 meta-tools in proxy mode (adds `workbench_use_tool`)
- Maintains lazy connection management (connections created per toolbox)
- **Enhances** support for multiple simultaneously open toolboxes by allowing duplicates
- Maintains proper cleanup when toolboxes close

### II. Tool Naming and Conflict Resolution

⚠️ **REQUIRES MODIFICATION** - Must extend naming convention:
- Current pattern `{server}_{tool}` will be extended to `{toolbox}__{server}_{tool}`
- This maintains deterministic, predictable naming while adding toolbox context
- Original tool names preserved in metadata for delegation (no change)
- Tool descriptions will maintain `[server]` prefix (or extend to `[toolbox/server]`)
- **Constitutional Impact**: This changes Principle II to include toolbox-level prefixing

**Justification**: The current naming convention cannot support duplicate servers across toolboxes. The extended pattern maintains the core principles (determinism, conflict prevention, clear provenance) while enabling the new capability.

### III. Mode-Agnostic Tool Invocation

✅ **PASS** - Both modes will be enhanced identically:
- Dynamic mode: Tools registered with `{toolbox}__{server}_{tool}` prefix
- Proxy mode: Tools returned with `{toolbox}__{server}_{tool}` prefix for `workbench_use_tool`
- Both modes delegate to downstream servers using original tool names (no change)
- Both modes return identical results (no change)
- Tool filters applied identically (no change)

### IV. Configuration as Contract

✅ **PASS** - No configuration schema changes required:
- `WORKBENCH_CONFIG` environment variable usage unchanged
- `mcpServers` schema remains standard MCP format
- Workbench-specific extensions (`toolFilters`, `transport`, `toolMode`) unchanged
- Validation remains at startup with fail-fast behavior
- **Enhancement**: Multiple toolboxes can now have overlapping server definitions (allowed, not an error)

### V. Fail-Safe Error Handling

✅ **PASS** - Error handling patterns remain unchanged:
- Configuration errors: fail fast at startup (no change)
- Connection errors: clean up partial connections, include toolbox + server name in errors
- Tool execution errors: set `isError: true`, wrap with toolbox/server/tool context (enhanced context)
- All errors include sufficient context: toolbox name, server name, tool name

**Enhancement**: Error messages will now include toolbox context to distinguish between duplicate server instances.

### Mandatory Documentation Updates Required

✅ **README.md** - Must be updated (per constitution section "Mandatory Documentation Updates"):
- Tool naming convention changes from `{server}_{tool}` to `{toolbox}__{server}_{tool}` (triggers: "Tool naming convention changes")
- Usage examples must show duplicate toolbox scenarios (triggers: "Changes to usage examples or workflows")

✅ **CLAUDE.md** - Must be updated (per constitution section "Mandatory Documentation Updates"):
- Tool registration logic changes in `client-manager.ts` (triggers: "Changes to tool registration or delegation logic")
- Extended naming convention (triggers: "Tool naming convention changes")

### Constitution Amendment Recommendation

**Principle II (Tool Naming and Conflict Resolution)** should be updated post-implementation to reflect the new `{toolbox}__{server}_{tool}` pattern as the canonical naming convention. This is a MINOR version bump (1.0.0 → 1.1.0) as it's a materially expanded guidance that doesn't remove the existing principle.

**Gate Status**: ✅ **PASS** - All constitutional principles are preserved or enhanced. The naming convention extension is a necessary evolution to support the new capability while maintaining the spirit of deterministic conflict prevention.

---

## Post-Design Constitution Re-Evaluation

**Date**: 2025-10-27 (After Phase 1: Design & Contracts)

### Design Validation Against Constitution

✅ **I. Meta-Server Orchestration Pattern** - CONFIRMED PASS
- Design maintains 3 meta-tools (dynamic) / 4 meta-tools (proxy) - no additions
- Lazy connection management preserved in `ClientManager.connectToServer()`
- Multiple simultaneous toolboxes with independent connection pools confirmed in data model
- Cleanup logic scoped to individual toolboxes in `OpenedToolbox.registeredTools` structure

✅ **II. Tool Naming and Conflict Resolution** - CONFIRMED MODIFICATION
- `{toolbox}__{server}_{tool}` format documented in [data-model.md](./data-model.md)
- Deterministic naming maintained: parsing logic defined and validated
- Original tool names preserved in `RegisteredToolInfo.original_name` field
- Tool descriptions enhanced to `[toolbox/server] description` format

✅ **III. Mode-Agnostic Tool Invocation** - CONFIRMED PASS
- Both modes use identical `{toolbox}__{server}_{tool}` naming (documented in [contracts/mcp-tools.json](./contracts/mcp-tools.json))
- Delegation logic uses `original_name` metadata in both modes
- Tool filters applied identically (no changes to filter logic)

✅ **IV. Configuration as Contract** - CONFIRMED PASS
- Configuration schema unchanged (verified in [research.md](./research.md) Q2)
- Validation logic unchanged (no modifications to `config-loader.ts`)
- Fail-fast behavior preserved

✅ **V. Fail-Safe Error Handling** - CONFIRMED PASS
- Error context enhanced with toolbox name (documented in [research.md](./research.md) Q5)
- Connection isolation maintained per toolbox (confirmed in [data-model.md](./data-model.md))
- Error wrapping format: `[toolbox/server/tool] error message`

### Documentation Updates Status

✅ **README.md** - Requirements confirmed in Constitution Check, to be updated during implementation:
- Tool naming convention change (`{server}_{tool}` → `{toolbox}__{server}_{tool}`)
- Usage examples with duplicate toolbox scenarios (see [quickstart.md](./quickstart.md) for content)

✅ **CLAUDE.md** - Requirements confirmed in Constitution Check, to be updated during implementation:
- Tool registration logic changes in `client-manager.ts`
- Extended naming convention documentation

### Constitution Amendment Status

**Recommendation Confirmed**: Principle II should be amended post-implementation to document `{toolbox}__{server}_{tool}` as the canonical pattern.

**Proposed Amendment** (for constitution v1.1.0):
```markdown
### II. Tool Naming and Conflict Resolution

All downstream tools MUST be prefixed with their toolbox and source server name using the pattern `{toolbox}__{server}_{tool}` to prevent naming conflicts across multiple toolboxes:

- Toolbox-and-server-prefixed naming is MANDATORY in both dynamic and proxy modes
- Tool names MUST be deterministic and predictable: `${toolboxName}__${serverName}_${originalToolName}`
- Original tool names MUST be preserved in metadata (`original_name` field) for delegation
- Tool descriptions MUST be prefixed with `[toolbox/server]` to indicate origin
- Toolbox names MUST NOT contain double underscores `__` (reserved as delimiter)

**Rationale**: Toolbox-level prefixing prevents tool name collisions when multiple toolboxes use the same MCP server, while maintaining clarity about tool provenance and enabling reliable delegation. The double underscore delimiter provides clear visual separation and reliable parsing.
```

### Final Gate Status

✅ **PASS** - Design validated against all constitutional principles:
1. ✅ Meta-server pattern preserved
2. ⚠️ Tool naming extended (justified and documented)
3. ✅ Mode-agnostic behavior maintained
4. ✅ Configuration contract unchanged
5. ✅ Error handling enhanced with context

**Ready to proceed to Phase 2 (Task Generation)** - Use `/speckit.tasks` command to generate implementation tasks.

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
├── index.ts              # Main MCP server, meta-tool registration, lifecycle
├── client-manager.ts     # MCP client connections, tool registration/delegation
├── config-loader.ts      # Configuration validation and loading
└── types.ts              # TypeScript type definitions

dist/                     # Compiled JavaScript output (not in git)
├── index.js
├── client-manager.js
├── config-loader.js
└── types.js

workbench-config.json     # Production configuration (example)
workbench-config.test.json # Test configuration with memory server
```

**Structure Decision**: Single TypeScript project following existing MCP Workbench structure. All feature changes will be contained within the existing four source files:
- `types.ts`: Update types to track toolbox ownership for tools and connections
- `client-manager.ts`: Modify tool naming from `{server}_{tool}` to `{toolbox}__{server}_{tool}`, update registration/delegation logic
- `index.ts`: Update tool metadata and descriptions to include toolbox context
- `config-loader.ts`: No changes required (configuration schema unchanged)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. The tool naming convention change (Principle II) is a necessary enhancement, not a violation, as it maintains the core principles while enabling the new capability.
