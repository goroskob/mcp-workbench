# Implementation Plan: Align Tool Identifier Property with MCP SDK Naming

**Branch**: `009-align-tool-identifier-name` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-align-tool-identifier-name/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Rename the `tool` property to `name` in the structured tool identifier to align with the official MCP SDK's Tool interface naming convention. The current structured tool identifier uses `{ toolbox, server, tool }`, but the MCP SDK's Tool interface uses `name` for the tool identifier property. This change improves API consistency and reduces cognitive overhead for developers familiar with MCP standards.

**Technical Approach**: Update the Zod schema (ToolIdentifierSchema) to use `name` instead of `tool`, update all code accessing `params.tool.tool` to use `params.tool.name`, update documentation and examples, and update error messages to reference the `name` field consistently.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8
**Storage**: N/A (in-memory state management only)
**Testing**: Manual testing with workbench-config.test.json
**Target Platform**: Node.js 18+ runtime
**Project Type**: Single project (MCP meta-server)
**Performance Goals**: N/A (schema and documentation change, no performance impact)
**Constraints**: Breaking API change - existing clients using `tool` property will need updates
**Scale/Scope**: Small change affecting ~5-10 lines of code across schema, implementation, documentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Meta-Server Orchestration Pattern
✅ **PASS** - No changes to meta-server pattern, meta-tools, or connection management

### Principle II: Tool Naming and Conflict Resolution
⚠️ **MODIFIED** - Changing tool identifier structure from `{ toolbox, server, tool }` to `{ toolbox, server, name }`

**Justification**: This change aligns the workbench's structured tool identifier with the MCP SDK's standard Tool interface which uses `name`. The three-level identification pattern remains unchanged (toolbox + server + tool name), only the property name changes from `tool` to `name`. This improves consistency with MCP standards and reduces cognitive overhead for developers familiar with the SDK.

**Constitution Impact**: The principle text currently references the `tool` field in examples. The principle will need updating after implementation to reflect `{ toolbox, server, name }` format.

### Principle III: Proxy-Based Tool Invocation
✅ **PASS** - Proxy invocation pattern unchanged, only property name in structured identifier changes

### Principle IV: Configuration as Contract
✅ **PASS** - No configuration schema changes

### Principle V: Fail-Safe Error Handling
✅ **PASS** - Error handling patterns unchanged, error messages will reference `name` instead of `tool`

### Principle VI: Release Policy and Workflow
✅ **PASS** - Standard release workflow applies, breaking change permitted during incubation

### Principle VII: Incubation Stage Policy
✅ **PASS** - Project is in incubation (v0.12.0), breaking changes are permitted

## Project Structure

### Documentation (this feature)

```text
specs/009-align-tool-identifier-name/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── meta-tools.md   # Updated use_tool documentation
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts            # MODIFIED: ToolIdentifierSchema, use_tool handler, documentation
├── client-manager.ts   # REVIEW: May need updates if accessing tool identifier fields
├── types.ts            # REVIEW: Check if ToolIdentifier type exists
└── config-loader.ts    # NO CHANGES

README.md               # MODIFIED: Examples using structured tool identifier
CLAUDE.md               # MODIFIED: Documentation referencing tool identifier structure
.specify/memory/constitution.md  # MODIFIED: Principle II examples
```

**Structure Decision**: Single project with TypeScript source in src/. This is a focused change affecting primarily the schema definition in src/index.ts (line 35), usage in the use_tool handler (lines 338, 341, 344, 349, 359), and documentation updates in inline comments and external docs.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations requiring justification. The modification to Principle II is a natural evolution aligning with MCP SDK standards and is permitted during incubation.*

## Post-Design Constitution Re-Check

*GATE: Re-check after Phase 1 design complete*

### Principle I: Meta-Server Orchestration Pattern
✅ **PASS** - Design confirms no changes to meta-server pattern, connection management, or toolbox lifecycle

### Principle II: Tool Naming and Conflict Resolution
✅ **PASS WITH AMENDMENT** - Design confirms property rename from `tool` to `name` in structured identifier

**Amendment Required**: Constitution Principle II examples need updating to reflect `{ toolbox, server, name }` format instead of `{ toolbox, server, tool }`. This will be part of implementation tasks.

**Design Validation**:
- Three-level identification pattern preserved (toolbox + server + tool name)
- Only property name changes, not the structure or purpose
- Aligns with MCP SDK Tool interface standard
- Clear migration path documented in contracts

### Principle III: Proxy-Based Tool Invocation
✅ **PASS** - Design confirms proxy invocation pattern unchanged, delegation logic uses `name` consistently

### Principle IV: Configuration as Contract
✅ **PASS** - Design confirms no configuration schema changes

### Principle V: Fail-Safe Error Handling
✅ **PASS** - Design confirms error handling patterns unchanged, error messages updated to reference `name`

### Principle VI: Release Policy and Workflow
✅ **PASS** - Standard release workflow applies, version bump to 0.13.0 (minor for breaking change during incubation)

### Principle VII: Incubation Stage Policy
✅ **PASS** - Breaking change permitted and encouraged during incubation, no migration guide required

**Final Gate Assessment**: All principles pass. Principle II amendment is straightforward and maintains the core pattern. Design is ready for task generation and implementation.
