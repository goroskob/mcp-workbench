# Data Model: Initialization Instructions for Toolboxes

**Feature**: 005-init-instructions-toolboxes
**Date**: 2025-10-28
**Purpose**: Define entities, structures, and relationships for initialization instructions

## Overview

This feature introduces minimal new data structures. The primary change is adding an `instructions` string field to the MCP initialization response, generated from existing configuration data.

## Core Entities

### 1. Toolbox Metadata (Existing - Read Only)

**Source**: Loaded from `workbench-config.json` at startup via `config-loader.ts`

**Structure** (from types.ts):
```typescript
interface ToolboxConfig {
  description?: string;
  mcpServers: Record<string, McpServerConfig>;
}
```

**Usage in This Feature**: Read-only access to generate initialization instructions
- `toolboxName` - Key from config.toolboxes map
- `description` - Toolbox purpose/usage text
- `serverCount` - Computed from `Object.keys(mcpServers).length`

**Validation Rules**: Already validated by config-loader.ts (no changes needed)

---

### 2. Initialization Instructions (New - Computed)

**Type**: String (plain text)

**Purpose**: Human-readable listing of available toolboxes for MCP initialization response

**Generation Logic**:
1. If no toolboxes configured:
   ```
   No toolboxes configured.

   To configure toolboxes, add them to your workbench-config.json file.
   See documentation for configuration format.
   ```

2. If toolboxes exist:
   ```
   Available Toolboxes:

   [toolbox-1] (N servers)
     Description: [description or "No description provided"]

   [toolbox-2] (M servers)
     Description: [description or "No description provided"]

   To access tools from a toolbox, use workbench_open_toolbox with the toolbox name.
   ```

**Format Specification**:
- Section header: "Available Toolboxes:"
- Blank line separator after header
- Per-toolbox format: `[name] (N servers)` on first line
- Indented description: Two spaces + "Description: " + text
- Blank line between toolboxes
- Footer guidance: Usage hint for workbench_open_toolbox

**Character Encoding**: UTF-8 (JavaScript string default)

**Size Constraints**:
- Realistic limit: ~50 toolboxes × 200 chars each = 10KB
- No protocol-defined hard limit
- Well within typical message sizes

---

### 3. MCP InitializeResult (Modified - SDK Type Extension)

**SDK Type** (from @modelcontextprotocol/sdk):
```typescript
interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;  // ← This field will now be populated
}
```

**Modification**: Populate the optional `instructions` field with generated toolbox listing

**Implementation Location**: src/index.ts initialization handler

**Example Response**:
```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": {}
  },
  "serverInfo": {
    "name": "mcp-workbench",
    "version": "1.0.0"
  },
  "instructions": "Available Toolboxes:\n\ndev (3 servers)\n  Description: Development environment tools\n\nprod (2 servers)\n  Description: Production monitoring tools\n\nTo access tools from a toolbox, use workbench_open_toolbox with the toolbox name."
}
```

---

## Data Flow

### Initialization Request Flow

```
1. MCP Client sends initialize request
   ↓
2. WorkbenchServer.initialize() handler called
   ↓
3. Generate instructions string:
   - Read this.config.toolboxes (already loaded)
   - Map over entries to build toolbox sections
   - Format with plain text template
   ↓
4. Return InitializeResult with:
   - protocolVersion
   - capabilities
   - serverInfo
   - instructions ← NEW: Generated toolbox listing
```

### Data Dependencies

```
workbench-config.json (file system)
   ↓ [startup, config-loader.ts]
WorkbenchConfig (in-memory object)
   ↓ [initialization handler reads]
Toolbox metadata extraction
   ↓ [string generation]
Instructions field (string)
   ↓ [returned in InitializeResult]
MCP Client receives instructions
```

**No Database**: All data sourced from in-memory configuration loaded at startup

**No State Changes**: Initialization does not modify any configuration or state

---

## State Transitions

### Instructions Generation States

This is a pure function with no state machine:

```
INPUT: WorkbenchConfig object
  ↓
COMPUTE: Extract toolbox names, descriptions, server counts
  ↓
FORMAT: Build plain text string
  ↓
OUTPUT: Instructions string
```

**Idempotent**: Calling initialization multiple times produces identical instructions (assuming config unchanged)

**Thread-Safe**: Read-only access to immutable configuration object

---

## Validation Rules

### At Configuration Load Time (Existing)

Already handled by config-loader.ts:
- Valid JSON structure
- Required fields present
- Type validation via Zod schemas

**No additional validation needed for this feature**

### At Instruction Generation Time (New)

Minimal validation needed:
1. **Empty toolboxes check**: `Object.keys(config.toolboxes).length === 0`
2. **Description sanitization**: Replace undefined with "No description provided"
3. **Server count computation**: `Object.keys(toolbox.mcpServers).length`

**Edge Cases Handled**:
- Empty toolbox name → Impossible (JSON keys can't be empty)
- Undefined description → Replace with default message
- Zero servers in toolbox → Would fail config validation (invalid config)
- Very long descriptions → No truncation (client handles display)

---

## Type Definitions (Proposed Changes)

### New Type in src/types.ts

```typescript
/**
 * Metadata for a toolbox extracted for initialization instructions
 */
export interface ToolboxMetadata {
  name: string;
  description: string;  // Never undefined - uses fallback
  serverCount: number;
}
```

### Existing Types (No Changes)

- `WorkbenchConfig` - unchanged
- `ToolboxConfig` - unchanged
- `OpenedToolbox` - unchanged
- `ServerConnection` - unchanged

---

## Migration Considerations

### Data Migration

**Required**: None - no persistent storage or schema changes

### Configuration Migration

**Required**: None - existing configuration format unchanged

**Optional**: Users may want to improve toolbox descriptions since they'll now be visible during initialization

---

## Performance Characteristics

### Memory Impact

- **Instruction string size**: ~200 bytes per toolbox average
- **For 20 toolboxes**: ~4KB additional memory during initialization
- **Garbage collection**: String deallocated after response sent
- **Impact**: Negligible

### CPU Impact

- **String concatenation**: O(n) where n = number of toolboxes
- **Typical time**: <1ms for 50 toolboxes
- **Optimization**: Array.join() more efficient than += concatenation
- **Impact**: Well within <100ms initialization constraint

### I/O Impact

- **File system**: Zero (config already loaded)
- **Network**: Zero (no external calls)
- **Database**: N/A
- **Impact**: None

---

## Testing Considerations

### Unit Testing

Test instruction generation with:
1. Empty toolboxes configuration
2. Single toolbox with description
3. Single toolbox without description
4. Multiple toolboxes (2-5 test cases)
5. Toolbox with special characters in description
6. Very long description (no truncation expected)

### Integration Testing

Test full initialization flow:
1. Connect MCP client
2. Send initialize request
3. Verify instructions field present
4. Verify formatting correct
5. Verify all toolboxes listed

### Manual Testing

Use existing test setup with workbench-config.test.json:
- Verify instructions displayed by MCP client
- Check readability and formatting
- Confirm server counts accurate

---

## Summary

**New Entities**: 1 (ToolboxMetadata - optional helper type)
**Modified Entities**: 1 (InitializeResult.instructions field populated)
**Data Sources**: Existing configuration (no new storage)
**State Management**: Stateless/pure function
**Complexity**: Low - simple string formatting from existing data

**Ready for Contracts Phase**: ✅ Yes
