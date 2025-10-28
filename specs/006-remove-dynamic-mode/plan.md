# Implementation Plan: Remove Dynamic Mode Support

**Branch**: `006-remove-dynamic-mode` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-remove-dynamic-mode/spec.md`

## Summary

Remove dynamic mode support from MCP Workbench, keeping only proxy mode operation. Rename meta-tools by dropping the `workbench_` prefix (`open_toolbox` and `use_tool`). Remove all tool registration logic, tool list changed notifications, and dynamic mode conditional code paths. Update configuration schema to reject `toolMode: "dynamic"`. Update initialization instructions to mention renamed tools. Version bump to 0.10.0.

## Technical Context

**Language/Version**: TypeScript 5.7.2 with ES2022 target, Node.js 18+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8
**Storage**: N/A (in-memory state management only)
**Testing**: Manual testing with workbench-config.test.json and real downstream MCP servers
**Target Platform**: Node.js server (cross-platform: Linux, macOS, Windows)
**Project Type**: Single (TypeScript library published to npm)
**Performance Goals**: Initialization <2s, toolbox opening <5s, zero performance regression from current proxy mode
**Constraints**: Breaking change acceptable (pre-1.0.0 incubation), backward compatible config loading (ignore obsolete fields)
**Scale/Scope**: ~1500 LOC codebase, 4 source files to modify, ~20 documentation references to update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Meta-Server Orchestration Pattern

**Status**: ⚠️ VIOLATION (requires update)

**Current State**:
- Constitution states: "MUST expose exactly 1 meta-tool in dynamic mode: `workbench_open_toolbox`"
- Constitution states: "MUST expose exactly 2 meta-tools in proxy mode: `workbench_open_toolbox` and `workbench_use_tool`"

**After This Feature**:
- Will expose exactly 2 meta-tools: `open_toolbox` and `use_tool` (renamed, no `workbench_` prefix)
- Dynamic mode removed entirely
- Proxy mode becomes the only mode

**Action Required**: Constitution MUST be updated to reflect:
- Removal of dynamic mode
- Tool renaming (drop `workbench_` prefix)
- Single mode of operation (proxy only)
- Updated meta-tool count and names

### Principle III: Mode-Agnostic Tool Invocation

**Status**: ⚠️ VIOLATION (principle becomes obsolete)

**Current State**: Constitution describes both dynamic and proxy modes

**After This Feature**: Only proxy mode exists

**Action Required**: Principle III MUST be removed or renamed to "Proxy-Only Tool Invocation" with simplified requirements

### Principle VI: Release Policy and Workflow

**Status**: ✅ COMPLIANT

- Version bump from 0.9.0 → 0.10.0 (minor) is correct
- Breaking change during pre-1.0.0 incubation is acceptable
- CHANGELOG.md update required
- Documentation updates required (README.md, CLAUDE.md)

### Other Principles

**Status**: ✅ COMPLIANT

- Principle II (Tool Naming): No changes, `{toolbox}__{server}__{tool}` format retained
- Principle IV (Configuration as Contract): Config validation will reject `toolMode: "dynamic"`
- Principle V (Fail-Safe Error Handling): Error handling patterns unchanged

### Overall Assessment

**CONDITIONAL PASS**: Implementation may proceed, but constitution MUST be updated as part of this feature to reflect:
1. Removal of dynamic mode references
2. Updated meta-tool names and count
3. Simplified mode description (proxy-only)

## Project Structure

### Documentation (this feature)

```text
specs/006-remove-dynamic-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output (code analysis findings)
├── data-model.md        # Phase 1 output (type system changes)
├── quickstart.md        # Phase 1 output (migration guide)
├── contracts/           # Phase 1 output (tool schemas)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts            # Main server - remove dynamic mode logic, rename tools
├── client-manager.ts   # Connection manager - remove registration logic
├── config-loader.ts    # Config validation - reject toolMode: "dynamic"
├── types.ts            # Type definitions - remove mode-specific types
└── env-expander.ts     # (unchanged)

tests/                  # Manual test configurations
└── workbench-config.test.json

docs/                   # Documentation updates
├── README.md           # Remove dynamic mode references, update examples
├── CLAUDE.md           # Update architecture section
└── CHANGELOG.md        # Add 0.10.0 entry

.specify/memory/
└── constitution.md     # Update Principles I and III
```

**Structure Decision**: Single project structure (existing TypeScript library). All changes are modifications to existing files plus documentation updates. No new source files needed - this is a code removal feature.

## Complexity Tracking

> No constitutional violations requiring justification. The violations identified in Constitution Check are intentional changes that require constitution updates, not complexity that needs justification.

## Phase 0: Research & Analysis

### Research Tasks

1. **Analyze Current Dynamic Mode Implementation**
   - Map all code paths that implement dynamic tool registration
   - Identify all locations where `toolMode` configuration is read
   - Document tool registration flow in `ClientManager.registerToolsOnServer()`
   - Document tool handler delegation mechanism
   - Document tool list changed notification logic

2. **Analyze Current Proxy Mode Implementation**
   - Verify proxy mode (`workbench_use_tool`) is fully functional
   - Document how `workbench_open_toolbox` returns tool schemas
   - Confirm tool routing logic in proxy mode
   - Verify no dependencies on dynamic mode for proxy operation

3. **Identify Tool Renaming Impact**
   - Search codebase for all references to `workbench_open_toolbox`
   - Search codebase for all references to `workbench_use_tool`
   - Search codebase for all references to `workbench_list_toolboxes` (already removed)
   - Search codebase for all references to `workbench_close_toolbox` (already removed)
   - Identify affected: source code, tests, documentation, examples

4. **Document Breaking Changes**
   - List all user-facing API changes
   - Draft migration guide content
   - Identify example configurations that need updates
   - Plan CHANGELOG.md entry structure

### Expected Outputs

**File**: `research.md`

**Sections**:
- Code Analysis: Dynamic mode implementation locations
- Code Analysis: Proxy mode verification
- Tool Renaming Impact: Complete reference list
- Breaking Changes: User-facing API changes
- Migration Strategy: Upgrade path for users
- Constitution Updates: Required principle changes

## Phase 1: Design & Contracts

### Data Model Changes

**File**: `data-model.md`

#### Type Removals

```typescript
// REMOVE from src/types.ts
export interface WorkbenchConfig {
  toolMode?: 'dynamic' | 'proxy';  // DELETE this field
  // ...
}

// REMOVE mode-specific return type variations
// Consolidate to single OpenToolboxResult type
```

#### Type Simplifications

```typescript
// SIMPLIFY: Single return type for open_toolbox
export interface OpenToolboxResult {
  toolbox: string;
  description: string;
  servers_connected: number;
  tools: ToolInfo[];  // Always return full tool list
}

// SIMPLIFY: OpenedToolbox no longer needs registeredTools map
export interface OpenedToolbox {
  connections: Map<string, ServerConnection>;
  // REMOVE: registeredTools: Map<string, RegisteredTool>;
}
```

### API Contracts

**Directory**: `contracts/`

#### Meta-Tool Schemas

**File**: `contracts/open_toolbox.json`

```json
{
  "name": "open_toolbox",
  "description": "Connect to a toolbox and discover available tools. Returns full tool list with schemas for invocation via use_tool.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "toolbox_name": {
        "type": "string",
        "description": "Name of the toolbox to open"
      }
    },
    "required": ["toolbox_name"]
  }
}
```

**File**: `contracts/use_tool.json`

```json
{
  "name": "use_tool",
  "description": "Execute a tool from an opened toolbox by delegating to the appropriate downstream server.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "toolbox_name": {
        "type": "string",
        "description": "Name of the opened toolbox containing the tool"
      },
      "tool_name": {
        "type": "string",
        "description": "Server-prefixed tool name (e.g., 'filesystem__read_file')"
      },
      "arguments": {
        "type": "object",
        "description": "Arguments to pass to the downstream tool"
      }
    },
    "required": ["toolbox_name", "tool_name"]
  }
}
```

### Migration Guide

**File**: `quickstart.md`

**Content Outline**:
1. **Breaking Changes Summary**
   - Dynamic mode removed
   - Tools renamed (drop `workbench_` prefix)
   - Configuration field `toolMode` deprecated

2. **Migration Steps**
   - Remove or ignore `toolMode` field from configuration
   - Update tool calls: `workbench_open_toolbox` → `open_toolbox`
   - Update tool calls: `workbench_use_tool` → `use_tool`
   - Verify initialization instructions for toolbox discovery

3. **Before/After Examples**
   - Configuration file comparison
   - Tool invocation comparison
   - Initialization response comparison

4. **Compatibility Notes**
   - Configs with `toolMode: "proxy"` still work (field ignored)
   - Configs with `toolMode: "dynamic"` fail with clear error
   - All tool functionality preserved (proxy mode was already implemented)

### Documentation Updates

**Files to Update**:
- `README.md`: Remove dynamic mode references, update tool names, update examples
- `CLAUDE.md`: Update architecture section, remove mode selection logic, update tool names
- `CHANGELOG.md`: Add 0.10.0 entry with breaking changes notice
- `.specify/memory/constitution.md`: Update Principles I and III per Constitution Check

### Agent Context Update

Run: `.specify/scripts/bash/update-agent-context.sh claude`

**Purpose**: Add technology details from this plan to Claude-specific context

**Expected Changes**: Add notes about:
- TypeScript type system simplifications
- Tool renaming convention
- Proxy-only mode operation
- Breaking change version (0.10.0)

## Phase 2: Implementation (NOT EXECUTED BY THIS COMMAND)

*Note: Phase 2 (task generation and implementation) is handled by `/speckit.tasks` and `/speckit.implement` commands.*

This plan provides the foundation for:
- Detailed task breakdown with file-level edits
- Step-by-step implementation sequence
- Verification checkpoints
- Testing strategy

---

**Plan Status**: ✅ Complete
**Ready for**: `/speckit.tasks` (task generation)
**Constitution Updates Required**: Yes (Principles I and III)
