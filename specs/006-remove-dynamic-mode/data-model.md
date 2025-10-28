# Data Model: Remove Dynamic Mode Support

## Overview

This document describes the type system changes required to remove dynamic mode support and simplify the MCP Workbench data model. All changes involve removing fields, simplifying types, or consolidating variants - no new complexity is added.

## Type Changes

### Configuration Schema

#### WorkbenchConfig (src/types.ts)

**Before:**
```typescript
export interface WorkbenchConfig {
  /** Named toolboxes containing MCP server configurations */
  toolboxes: Record<string, ToolboxConfig>;
  /** Tool invocation mode: 'dynamic' (default) = tools are dynamically registered, 'proxy' = tools accessed via workbench_use_tool */
  toolMode?: 'dynamic' | 'proxy';
}
```

**After:**
```typescript
export interface WorkbenchConfig {
  /** Named toolboxes containing MCP server configurations */
  toolboxes: Record<string, ToolboxConfig>;
  // toolMode field REMOVED - proxy mode is now the only mode
}
```

**Changes:**
- ❌ Remove `toolMode` field entirely from type definition
- ❌ Remove JSDoc comment about mode selection
- ✅ Add comment noting proxy-only operation if helpful for clarity

**Validation (src/config-loader.ts):**
```typescript
// Update Zod schema to reject toolMode: "dynamic"
const WorkbenchConfigSchema = z.object({
  toolboxes: z.record(ToolboxConfigSchema),
  // toolMode is no longer validated - if present, it's ignored (backward compat)
  // BUT we should warn or error if toolMode: "dynamic" is specified
}).strict();

// Add custom validation after parsing:
if (config.toolMode === 'dynamic') {
  throw new Error('Dynamic mode is no longer supported as of v0.10.0. Please remove the toolMode field or use proxy mode.');
}
```

### Runtime State

#### OpenedToolbox (src/types.ts)

**Before:**
```typescript
export interface OpenedToolbox {
  connections: Map<string, ServerConnection>;
  registeredTools: Map<string, { remove: () => void }>;
}
```

**After:**
```typescript
export interface OpenedToolbox {
  connections: Map<string, ServerConnection>;
  // registeredTools field REMOVED - no dynamic registration in proxy-only mode
}
```

**Changes:**
- ❌ Remove `registeredTools` field
- **Impact**: `ClientManager` no longer tracks or manages tool registration/unregistration
- **Cleanup**: Remove all code that reads/writes `registeredTools`

### Response Types

#### OpenToolboxResult (src/types.ts)

**Before (two variants based on mode):**
```typescript
// Dynamic mode variant
interface OpenToolboxDynamicResult {
  toolbox: string;
  description: string;
  servers_connected: number;
  tools_registered: number;
}

// Proxy mode variant
interface OpenToolboxProxyResult {
  toolbox: string;
  description: string;
  servers_connected: number;
  tools: ToolInfo[];
}
```

**After (single type):**
```typescript
export interface OpenToolboxResult {
  toolbox: string;
  description: string;
  servers_connected: number;
  tools: ToolInfo[];  // Always return full tool list with schemas
}
```

**Changes:**
- ✅ Consolidate to single type (always returns full tool list)
- ❌ Remove mode-specific variants
- ❌ Remove `tools_registered` field (no longer applicable)

### Tool Metadata

#### ToolInfo (src/types.ts)

**No changes required** - this type remains unchanged:

```typescript
export interface ToolInfo {
  name: string;              // Prefixed name: {toolbox}__{server}__{tool}
  description: string;       // Prefixed description: [toolbox/server] {original}
  inputSchema: object;       // JSON schema for tool parameters
  source_server: string;     // Which MCP server provides this tool
  toolbox_name: string;      // Which toolbox this tool belongs to
  original_name: string;     // Unprefixed tool name for delegation
}
```

**Rationale**: `ToolInfo` is used by `use_tool` for routing and remains essential in proxy mode.

## Method Signature Changes

### ClientManager (src/client-manager.ts)

#### openToolbox()

**Before:**
```typescript
async openToolbox(
  toolboxName: string,
  server: McpServer,
  config: WorkbenchConfig
): Promise<OpenToolboxResult>
```

**After:**
```typescript
async openToolbox(
  toolboxName: string,
  config: WorkbenchConfig
): Promise<OpenToolboxResult>
```

**Changes:**
- ❌ Remove `server: McpServer` parameter (no longer needed for registration)
- ✅ Always return full tool list (no mode branching)
- ❌ Remove tool registration logic
- ❌ Remove `sendToolListChanged()` call

#### Methods to Remove Entirely

**registerToolsOnServer()** - Delete ~100 LOC
```typescript
// REMOVE THIS METHOD
private registerToolsOnServer(
  toolboxName: string,
  serverName: string,
  tools: Tool[],
  server: McpServer,
  toolFilters: string[]
): Map<string, { remove: () => void }>
```

**unregisterToolsFromServer()** - Delete ~15 LOC
```typescript
// REMOVE THIS METHOD
private unregisterToolsFromServer(
  toolbox: OpenedToolbox
): void
```

**closeAllToolboxes()** - Simplify (no unregistration)
```typescript
// BEFORE: Unregisters tools then disconnects
async closeAllToolboxes(): Promise<void> {
  for (const [name, toolbox] of this.openedToolboxes) {
    this.unregisterToolsFromServer(toolbox);  // REMOVE THIS LINE
    // disconnect logic remains
  }
}

// AFTER: Just disconnects
async closeAllToolboxes(): Promise<void> {
  for (const [name, toolbox] of this.openedToolboxes) {
    // Only disconnect - no unregistration needed
    for (const connection of toolbox.connections.values()) {
      await connection.client.close();
    }
  }
}
```

## Meta-Tool Definitions

### Tool Names (src/index.ts)

**Before:**
```typescript
server.registerTool("workbench_open_toolbox", { /* ... */ });
server.registerTool("workbench_use_tool", { /* ... */ });
```

**After:**
```typescript
server.registerTool("open_toolbox", { /* ... */ });
server.registerTool("use_tool", { /* ... */ });
```

**Changes:**
- ✅ Rename all tool definitions
- ✅ Update tool descriptions to reference new names
- ✅ Update error messages to use new names

## Initialization Instructions

### generateToolboxInstructions() (src/index.ts)

**Before:**
```typescript
private generateToolboxInstructions(): string {
  // ...
  return `Available toolboxes:\n\n${entries.join('\n\n')}\n\nUse workbench_open_toolbox to connect.`;
}
```

**After:**
```typescript
private generateToolboxInstructions(): string {
  // ...
  return `Available toolboxes:\n\n${entries.join('\n\n')}\n\nUse open_toolbox to connect to a toolbox, then use_tool to invoke tools.`;
}
```

**Changes:**
- ✅ Update usage guidance to mention both renamed tools
- ✅ Explicitly state the proxy invocation pattern

## Validation & Error Messages

### Configuration Validation

**Add to config-loader.ts:**
```typescript
export function loadConfig(configPath: string): WorkbenchConfig {
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Validate with Zod (toolMode field ignored if present)
  const config = WorkbenchConfigSchema.parse(rawConfig);

  // Reject dynamic mode explicitly
  if (rawConfig.toolMode === 'dynamic') {
    throw new Error(
      'Dynamic mode is no longer supported as of v0.10.0.\n' +
      'Please remove the "toolMode" field from your configuration.\n' +
      'The workbench now operates exclusively in proxy mode.\n' +
      'See migration guide: https://github.com/hlibkoval/mcp-workbench/releases/tag/v0.10.0'
    );
  }

  // Optionally warn about proxy mode (redundant but harmless)
  if (rawConfig.toolMode === 'proxy') {
    console.warn('Note: toolMode field is deprecated and will be ignored. Proxy mode is now the default.');
  }

  return config;
}
```

### Error Message Updates

**Search and replace across codebase:**
- `workbench_open_toolbox` → `open_toolbox`
- `workbench_use_tool` → `use_tool`
- "dynamic mode" → (remove or replace with "proxy mode")

## Migration Path

### Backward Compatibility

**Supported:**
- ✅ Configs without `toolMode` field (implicit proxy mode)
- ✅ Configs with `toolMode: "proxy"` (field ignored, warning logged)

**Rejected:**
- ❌ Configs with `toolMode: "dynamic"` (clear error with migration guidance)

### Type Safety

All type changes maintain or improve type safety:
- Simpler types (fewer fields = less state to manage)
- Single code path (no mode branching)
- No `any` types introduced
- Strict null checks remain enabled

## Summary

**Total Changes:**
- **Removed**: 3 type fields (`toolMode`, `registeredTools`, `tools_registered`)
- **Removed**: 2 methods (`registerToolsOnServer`, `unregisterToolsFromServer`)
- **Simplified**: 1 method (`closeAllToolboxes`)
- **Renamed**: 2 meta-tools (`open_toolbox`, `use_tool`)
- **Consolidated**: 2 response types → 1 response type

**Lines of Code Impact:**
- ~300 LOC removed (primarily registration logic)
- ~50 LOC updated (tool names, error messages)
- 0 LOC added (pure simplification)

**Type Safety Impact:**
- ✅ Improved (fewer states, simpler types)
- ✅ No breaking changes to downstream tool schemas
- ✅ Configuration validation enhanced (explicit dynamic mode rejection)
