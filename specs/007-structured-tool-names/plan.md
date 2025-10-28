# Implementation Plan: Structured Tool Names

**Branch**: `007-structured-tool-names` | **Date**: 2025-10-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-structured-tool-names/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace string-based tool naming (`{toolbox}__{server}__{tool}`) with structured objects (`{ toolbox, server, tool }`) throughout the MCP Workbench codebase. This affects both external API parameters (use_tool, open_toolbox responses) and internal code representations. The change eliminates string parsing logic, improves clarity, and prevents ambiguity with special characters in tool names.

**Technical Approach**: Define TypeScript interfaces for structured tool identifiers, update type definitions, modify use_tool parameter schema to accept structured object, update open_toolbox to return structured metadata, refactor ClientManager internal logic to use structured representations, and update error handling to reference components separately.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 (validation)
**Storage**: N/A (in-memory state management only)
**Testing**: Manual testing with workbench-config.test.json and real MCP servers
**Target Platform**: Node.js server runtime (stdio transport)
**Project Type**: Single project (TypeScript library)
**Performance Goals**: No performance regression - tool routing should be faster without string parsing
**Constraints**: Must maintain compatibility with MCP SDK types, breaking change requires minor version bump
**Scale/Scope**: ~2000 LOC codebase, 2 meta-tools affected, internal state management refactor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Evaluation

**I. Meta-Server Orchestration Pattern**
- ✅ **PASS**: Change does not affect meta-server pattern - still 2 meta-tools (open_toolbox, use_tool)
- ✅ **PASS**: No change to lazy connection management or lifecycle
- ✅ **PASS**: No change to initialization instructions or toolbox discovery
- **Action**: Ensure structured format is reflected in initialization instructions examples

**II. Tool Naming and Conflict Resolution**
- ⚠️ **REQUIRES ADAPTATION**: String-based naming pattern (`{toolbox}__{server}__{tool}`) is being replaced
- **Current principle**: "All downstream tools MUST be prefixed with both their toolbox and source server name using the pattern `{toolbox}__{server}__{tool}`"
- **New approach**: Structured objects `{ toolbox, server, tool }` achieve same conflict resolution goal without string concatenation
- **Justification**: Structured format preserves three-level naming semantics while eliminating parsing ambiguity
- **Action**: Update constitution principle II to reflect structured approach (constitution version 1.7.0)

**III. Proxy-Based Tool Invocation**
- ✅ **PASS**: use_tool meta-tool remains the invocation mechanism
- ⚠️ **REQUIRES UPDATE**: use_tool parameter format changes from string to structured object
- ✅ **PASS**: Tool delegation to downstream servers unchanged (still uses original tool names)
- **Action**: Update principle III to specify structured parameter format

**IV. Configuration as Contract**
- ✅ **PASS**: No configuration schema changes required
- ✅ **PASS**: No changes to mcpServers format or environment variable expansion

**V. Fail-Safe Error Handling**
- ✅ **PASS**: Error handling enhanced - separate field references improve clarity
- **Action**: Ensure error messages use structured field references (FR-006)

**VI. Release Policy and Workflow**
- ✅ **PASS**: Breaking change requires minor version bump (currently pre-1.0.0 incubation)
- **Action**: Target version 0.11.0, update CHANGELOG.md with breaking change notice

### Quality Standards Evaluation

**TypeScript Type Safety**
- ✅ **PASS**: Strict mode remains enabled
- ✅ **PASS**: Structured types will be explicitly defined in src/types.ts
- **Action**: Define ToolIdentifier interface and update ToolInfo

**Documentation Standards**
- ⚠️ **REQUIRES UPDATE**: Breaking change triggers mandatory documentation updates
- **Action**: Update README.md with new usage examples
- **Action**: Update CLAUDE.md with new architecture patterns
- **Action**: Update tool descriptions and initialization instructions

**Testing Philosophy**
- ✅ **PASS**: Continue using workbench-config.test.json with real MCP servers
- **Action**: Validate structured format with @modelcontextprotocol/server-memory

### Gate Decision

**Status**: ✅ **CONDITIONAL PASS** with required actions

**Required Actions Before Implementation**:
1. Update constitution.md to version 1.7.0 reflecting structured naming approach
2. Plan documentation updates for README.md and CLAUDE.md
3. Version bump to 0.11.0 in implementation phase

## Project Structure

### Documentation (this feature)

```text
specs/007-structured-tool-names/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (completed)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # Main MCP server (meta-tools, schema updates)
├── client-manager.ts    # Connection pool (internal refactor to structured objects)
├── config-loader.ts     # Configuration validation (no changes needed)
├── env-expander.ts      # Environment expansion (no changes needed)
└── types.ts             # Type definitions (new ToolIdentifier interface, updated ToolInfo)

tests/
└── (manual testing with workbench-config.test.json)

docs/
├── README.md            # User documentation (breaking change examples)
└── CLAUDE.md            # Architecture documentation (structured naming patterns)

.specify/memory/
└── constitution.md      # Project principles (update to v1.7.0)

CHANGELOG.md             # Release notes (breaking change notice for v0.11.0)
package.json             # Version bump to 0.11.0
```

**Structure Decision**: Single project structure (Option 1) - MCP Workbench is a TypeScript library with clear separation of concerns: meta-tools (index.ts), client management (client-manager.ts), configuration (config-loader.ts, env-expander.ts), and type definitions (types.ts).

## Complexity Tracking

> No constitutional violations requiring justification. The structured naming approach aligns with existing principles (conflict resolution, clarity) while improving implementation quality.

## Phase 0: Research

### Research Questions

1. **TypeScript Interface Design**
   - Question: What is the optimal TypeScript interface design for ToolIdentifier that balances type safety with SDK compatibility?
   - Context: MCP SDK uses Tool type from @modelcontextprotocol/sdk, need to ensure structured format integrates cleanly

2. **Zod Schema for Structured Parameters**
   - Question: How should the Zod schema for use_tool parameters validate structured tool objects?
   - Context: Current UseToolInputSchema uses z.string() for tool_name, needs to become z.object() with nested validation

3. **Backward Compatibility Strategy**
   - Question: Is there any need for migration tooling or compatibility warnings?
   - Context: Assumption A-002 states no backward compatibility required, but should verify with existing deployments

4. **Error Message Patterns**
   - Question: What error message templates provide clearest debugging information with structured fields?
   - Context: FR-006 requires separate component references, need examples for each error scenario

### Research Tasks

**Task 1: TypeScript Interface Patterns for Tool Identification**
- Research: Best practices for structured identifiers in TypeScript MCP servers
- Output: Recommended ToolIdentifier interface definition
- Considerations: Readonly properties, optional fields, validation helpers

**Task 2: Zod Schema Composition for Nested Objects**
- Research: Zod patterns for validating nested objects with required string fields
- Output: Schema definition for use_tool structured parameter
- Considerations: Error messages, field validation, extra field handling

**Task 3: MCP SDK Tool Type Extensions**
- Research: How to extend MCP SDK Tool type with structured metadata
- Output: Updated ToolInfo interface that maintains SDK compatibility
- Considerations: Type composition, property naming conventions

**Task 4: Error Handling Patterns for Structured Data**
- Research: Error message formatting best practices with structured context
- Output: Error message templates for each failure scenario
- Considerations: Human readability, machine parsability, debug context

## Phase 1: Design

### Data Model

**Key Type Definitions** (to be detailed in data-model.md):

1. **ToolIdentifier Interface**
   - Purpose: Structured representation of tool identity
   - Fields: toolbox (string), server (string), tool (string)
   - Validation: Non-empty strings, no special requirements (eliminates parsing ambiguity)

2. **Updated ToolInfo Interface**
   - Extends: MCP SDK Tool type
   - Added Fields: Structured metadata (toolbox_name, source_server as separate fields)
   - Removed: Concatenated name field (replaced with original tool name)

3. **Internal State Representation**
   - Update: ClientManager internal maps to use ToolIdentifier as keys or structured lookups
   - Consider: Map<string, Map<string, Connection>> nested structure vs. composite key pattern

### API Contracts

**Affected Meta-Tools** (to be detailed in contracts/):

1. **use_tool**
   - Current: `{ toolbox_name: string, tool_name: string, arguments: object }`
   - New: `{ tool: { toolbox: string, server: string, tool: string }, arguments: object }`
   - Breaking: Yes - parameter structure changes

2. **open_toolbox**
   - Current: Returns tools with concatenated names
   - New: Returns tools with separate toolbox_name, source_server, name fields
   - Breaking: Yes - response structure changes (existing fields change meaning)

### Migration Strategy

**Version Bump**: 0.10.0 → 0.11.0 (minor version, breaking change acceptable during incubation)

**Documentation Updates**:
- README.md: New usage examples with structured format
- CLAUDE.md: Updated tool naming architecture section
- Initialization instructions: Example showing structured format

**No Migration Tooling**: Per assumption A-002, clean break with no backward compatibility

## Phase 2: Tasks

*Deferred to /speckit.tasks command - not generated by /speckit.plan*

## Open Questions

1. Should initialization instructions include a structured format example, or rely on open_toolbox response format?
2. Should ToolIdentifier interface be exported for MCP client library use?
3. Any performance implications of nested object validation vs. string parsing?

## Success Validation

**Pre-Implementation Checklist**:
- [ ] Constitution updated to v1.7.0 with structured naming principle
- [ ] Research.md completed with interface and schema recommendations
- [ ] Data-model.md defines ToolIdentifier and updated ToolInfo
- [ ] Contracts/ defines new use_tool and open_toolbox schemas
- [ ] Version bump plan to 0.11.0 confirmed

**Post-Implementation Validation** (from Success Criteria):
- [ ] SC-001: Manual test - invoke tool with structured object
- [ ] SC-002: Verify open_toolbox response has separate fields
- [ ] SC-003: Test tool names with __ characters
- [ ] SC-004: Trigger each error scenario, verify message format
- [ ] SC-005: Code search for split('__') returns zero matches
- [ ] SC-006: TypeScript compilation with strict mode passes
