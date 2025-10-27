# Implementation Plan: Tool Naming Format Update

**Branch**: `002-tool-naming-format` | **Date**: 2025-10-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-tool-naming-format/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Change the tool naming format from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}` to establish consistent double-underscore separators between all components (toolbox, server, and tool). This eliminates mixed separator patterns and simplifies parsing logic. This is an incompatible change released as a minor version bump (0.4.0 → 0.5.0) per maintainer decision.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation
**Storage**: In-memory state management (no persistent storage required)
**Testing**: Manual testing with real downstream MCP servers (documented in TESTING.md)
**Target Platform**: Node.js servers (Linux, macOS, Windows)
**Project Type**: Single Node.js application (MCP server)
**Performance Goals**: Sub-millisecond tool name parsing, instant tool registration/unregistration
**Constraints**: Must maintain backward compatibility with MCP SDK, must not break existing downstream server integrations
**Scale/Scope**: Support hundreds of tools across multiple toolboxes without performance degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle II: Tool Naming and Conflict Resolution
**Status**: ✅ PASS - This feature directly implements an update to this principle

The current constitution (v1.1.0) mandates the format `{toolbox}__{server}_{tool}` with mixed separators. This feature updates the format to `{toolbox}__{server}__{tool}` with consistent double underscores.

**Required Actions**:
- Update constitution document to reflect new naming format
- Bump constitution version to 1.2.0 (MINOR - new naming convention)
- Update all documentation references to the naming format

### Principle III: Mode-Agnostic Tool Invocation
**Status**: ✅ PASS - Change applies equally to both modes

The naming format change must be applied consistently in both dynamic mode (tool registration) and proxy mode (tool list return). The implementation affects:
- `ClientManager.generateToolName()` - used by both modes
- `ClientManager.parseToolName()` - used by both modes
- Tool registration in dynamic mode
- Tool list generation in proxy mode

### Principle V: Fail-Safe Error Handling
**Status**: ✅ PASS - Error handling must be updated

Tool name parsing errors should include context about the expected new format:
- Invalid format errors should show expected pattern `{toolbox}__{server}__{tool}`
- Error messages should guide users toward migration documentation

### Mandatory Documentation Updates
**Status**: ⚠️ REQUIRES ACTION - Multiple documentation updates needed

Per constitution requirements, the following documents MUST be updated:

**README.md** (user-facing):
- Update "Tool Naming Convention" section with new format
- Add migration guide for incompatible change
- Update all tool name examples throughout
- Add CHANGELOG entry for incompatible change

**CLAUDE.md** (developer-facing):
- Update architecture overview with new naming pattern
- Update "Tool Name Conflicts" section
- Update all code examples showing tool names
- Update design patterns section

**Version Bump**:
- MINOR version bump (0.4.0 → 0.5.0) per maintainer decision despite incompatible nature
- Document deviation from semantic versioning in OOS-005

### Overall Gate Result
**✅ PASS WITH ACTIONS REQUIRED**

No principle violations. All required documentation updates are identified and will be executed in Phase 1. Note: Version strategy deviates from strict semver (incompatible change as minor bump) but is explicitly documented.

## Project Structure

### Documentation (this feature)

```text
specs/002-tool-naming-format/
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
├── index.ts             # Main MCP server (meta-tools, lifecycle)
├── client-manager.ts    # Connection pool, tool registration/delegation
├── config-loader.ts     # Configuration validation
└── types.ts             # TypeScript type definitions

# No test directory exists yet - manual testing with real MCP servers
# Test configurations in repository root
workbench-config.test.json  # Test configuration with example servers

# Documentation at repository root
README.md         # User-facing documentation
CLAUDE.md         # Developer/AI agent guidance
CHANGELOG.md      # Release notes and breaking changes
TESTING.md        # Manual testing guide
```

**Structure Decision**: Single Node.js application with TypeScript. All source code in `src/` directory. The feature modifies existing files (primarily `client-manager.ts`) and requires documentation updates across README.md, CLAUDE.md, and the constitution file.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution principle violations. All gates passed.

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design artifacts are complete*

### Design Artifacts Review

**Generated Artifacts**:
- ✅ research.md - Research findings and decisions (updated with 0.5.0 version)
- ✅ data-model.md - Data structure and validation rules
- ✅ contracts/README.md - Internal API contracts
- ✅ quickstart.md - Implementation guide (updated with 0.5.0 version)

### Constitution Compliance Verification

#### Principle II: Tool Naming and Conflict Resolution
**Post-Design Status**: ✅ CONFIRMED PASS

Design artifacts confirm:
- Naming format change is clearly documented in all artifacts
- Parsing logic is simplified and consistent
- Edge cases (underscores in tool names) are properly handled
- No new conflicts introduced

**Design validates**:
- `generateToolName()` produces consistent format
- `parseToolName()` correctly extracts all three components
- Tool names with underscores handled correctly (e.g., `read_file_async`)

#### Principle III: Mode-Agnostic Tool Invocation
**Post-Design Status**: ✅ CONFIRMED PASS

Design artifacts confirm:
- Both dynamic and proxy modes use identical naming
- `generateToolName()` called by both registration and listing code
- No mode-specific parsing or generation logic
- Contract tests verify mode parity

#### Principle V: Fail-Safe Error Handling
**Post-Design Status**: ✅ CONFIRMED PASS

Design artifacts specify:
- Clear error messages for invalid format: `Expected format: {toolbox}__{server}__{tool}`
- Context-rich errors include toolbox/server/tool information
- Migration guidance in error messages
- No silent failures or unclear error states

#### Mandatory Documentation Updates
**Post-Design Status**: ✅ PLAN COMPLETE

All documentation updates are specified in quickstart.md:
- README.md: Migration guide, examples updated, new format throughout
- CLAUDE.md: Architecture docs, naming pattern updated
- constitution.md: Principle II updated, version bumped to 1.2.0
- CHANGELOG.md: Incompatible change documentation
- Version bump to 0.5.0 documented

### Design Quality Assessment

**Simplicity**: ✅ PASS
- Parsing reduced from ~30 lines to ~15 lines
- No special cases or conditional logic
- Single split operation with limit

**Consistency**: ✅ PASS
- Same format used everywhere
- No mode-specific variations
- Clear validation rules

**Maintainability**: ✅ PASS
- Simpler code is easier to maintain
- Well-documented in contracts and data-model
- Test scenarios clearly defined

### Gate Result: ✅ ALL CHECKS PASS

The design phase has validated that:
1. No new principle violations introduced
2. All complexity is justified (simplified parsing)
3. Documentation plan is complete
4. Implementation is straightforward (~55 minutes estimated)
5. Version strategy (0.5.0 minor bump for incompatible change) is explicitly documented

**Ready for Phase 2**: Generate implementation tasks via `/speckit.tasks`
