# Research: Remove Dynamic Mode Support

**Feature Branch**: `006-remove-dynamic-mode`
**Research Date**: 2025-10-28
**Spec**: [spec.md](./spec.md)

## Executive Summary

This research analyzes the dynamic mode implementation in MCP Workbench to facilitate its safe removal. Dynamic mode currently allows downstream tools to be dynamically registered on the workbench server with prefixed names, making them appear natively in MCP clients. Removing this simplifies the codebase to proxy-only mode, where tools are accessed via the `use_tool` meta-tool.

**Key Findings**:
- Dynamic mode is implemented across 4 source files with ~300 LOC dedicated to registration logic
- Tool registration occurs in `ClientManager.registerToolsOnServer()` at line 276-376
- Tool list changed notifications sent via `server.sendToolListChanged()` at line 247
- Proxy mode is fully functional and independent of dynamic mode
- Tool renaming impacts 28+ files including source code, tests, and documentation
- Breaking change affects most users (dynamic mode is default in v0.9.0)

## 1. Dynamic Mode Implementation Analysis

### 1.1 Configuration Loading

**File**: `/Users/gleb/Projects/mcp-workbench/src/config-loader.ts`
**Lines**: 33-36

```typescript
// Validate toolMode if provided
if (config.toolMode !== undefined && config.toolMode !== 'dynamic' && config.toolMode !== 'proxy') {
  throw new Error("Configuration field 'toolMode' must be either 'dynamic' or 'proxy'");
}
```

**Purpose**: Validates `toolMode` configuration field, allowing either "dynamic" or "proxy"

**Removal Action**: Change validation to reject "dynamic" mode with clear error message

---

### 1.2 Tool Description Generation

**File**: `/Users/gleb/Projects/mcp-workbench/src/index.ts`
**Lines**: 119-207

```typescript
// Tool 1: Open a toolbox
// Description varies based on tool mode (proxy vs dynamic)
const openToolboxDescription = this.config.toolMode === 'proxy'
  ? `Open a toolbox and discover its available tools.
     ...
     Returns full tool list with schemas for use with workbench_use_tool.`
  : `Open a toolbox and register its tools on the workbench server.
     ...
     Tools are registered dynamically and appear in your tool list.`;
```

**Purpose**: Generates different descriptions for `open_toolbox` based on toolMode

**Removal Action**: Remove conditional, use only proxy mode description (with renamed tool names)

---

### 1.3 Conditional Tool Registration

**File**: `/Users/gleb/Projects/mcp-workbench/src/index.ts`
**Lines**: 280-355

```typescript
// Tool 2: Use a tool (proxy mode) - only if toolMode is 'proxy'
if (this.config.toolMode === 'proxy') {
  this.server.registerTool(
    "workbench_use_tool",
    { /* schema */ },
    async (args: { [x: string]: any }) => { /* handler */ }
  );
}
```

**Purpose**: Conditionally registers `workbench_use_tool` only in proxy mode

**Removal Action**: Remove conditional, always register `use_tool` (renamed)

---

### 1.4 Tool Registration on Server

**File**: `/Users/gleb/Projects/mcp-workbench/src/client-manager.ts`
**Lines**: 276-376

```typescript
/**
 * Register all downstream tools on the workbench server
 * Tools are prefixed with server name to avoid conflicts
 */
private async registerToolsOnServer(
  mcpServer: McpServer,
  toolboxName: string,
  connections: Map<string, ServerConnection>
): Promise<Map<string, any>> {
  const registeredTools = new Map<string, any>();

  for (const [serverName, connection] of connections) {
    for (const tool of connection.tools) {
      // Prefix tool name with toolbox and server name
      const prefixedName = this.generateToolName(toolboxName, serverName, tool.name);

      // Register tool on workbench server with a handler that delegates to downstream
      const registeredTool = mcpServer.registerTool(
        prefixedName,
        {
          title: tool.title,
          description: tool.description
            ? `[${toolboxName}/${serverName}] ${tool.description}`
            : `Tool from ${toolboxName}/${serverName}`,
          inputSchema: tool.inputSchema as any,
          annotations: tool.annotations,
          _meta: {
            ...tool._meta,
            source_server: serverName,
            toolbox_name: toolboxName,
            original_name: tool.name,
          },
        },
        async (args: any) => {
          // Parse the registered tool name to extract components
          const parsed = this.parseToolName(prefixedName);
          // ... routing logic ...
          const result = await targetConnection.client.callTool({
            name: parsed.originalTool,
            arguments: args,
          });
          return result;
        }
      );

      registeredTools.set(prefixedName, registeredTool);
    }
  }

  return registeredTools;
}
```

**Purpose**: Core dynamic mode logic - registers downstream tools on workbench server with delegation handlers

**Removal Action**: Delete entire method - no longer needed in proxy-only mode

---

### 1.5 Tool Unregistration

**File**: `/Users/gleb/Projects/mcp-workbench/src/client-manager.ts`
**Lines**: 381-395

```typescript
/**
 * Unregister all tools for a toolbox from the workbench server
 */
private unregisterToolsFromServer(toolboxName: string): void {
  const toolbox = this.openedToolboxes.get(toolboxName);
  if (!toolbox) {
    return;
  }

  // Remove all registered tools
  for (const registeredTool of toolbox.registeredTools.values()) {
    try {
      registeredTool.remove();
    } catch (error) {
      console.error(`Error removing tool:`, error);
    }
  }
}
```

**Purpose**: Cleanup method to unregister tools when toolbox closes

**Removal Action**: Delete entire method - no tools registered in proxy mode

---

### 1.6 Tool List Changed Notification

**File**: `/Users/gleb/Projects/mcp-workbench/src/index.ts`
**Lines**: 246-247

```typescript
// Notify clients that tool list has changed
this.server.sendToolListChanged();
```

**Purpose**: Notifies MCP clients when tools are dynamically registered

**Removal Action**: Delete notification call - no dynamic tool registration in proxy mode

---

### 1.7 RegisteredTools Storage

**File**: `/Users/gleb/Projects/mcp-workbench/src/client-manager.ts`
**Lines**: 190-204

```typescript
// Register tools on the workbench server
const registeredTools = await this.registerToolsOnServer(
  mcpServer,
  toolboxName,
  connections
);

// Store opened toolbox
const openedToolbox: OpenedToolbox = {
  name: toolboxName,
  config: toolboxConfig,
  connections,
  registeredTools,  // Store registered tool references
  opened_at: new Date(),
};
```

**Purpose**: Stores registered tool references for later cleanup

**Removal Action**: Remove `registeredTools` field from `OpenedToolbox` type and initialization

---

### 1.8 Type Definitions

**File**: `/Users/gleb/Projects/mcp-workbench/src/types.ts`
**Lines**: 48-49, 115

```typescript
export interface WorkbenchConfig {
  toolboxes: Record<string, ToolboxConfig>;
  /** Tool invocation mode: 'dynamic' (default) = tools are dynamically registered, 'proxy' = tools accessed via workbench_use_tool */
  toolMode?: 'dynamic' | 'proxy';
}

export interface OpenedToolbox {
  name: string;
  config: ToolboxConfig;
  connections: Map<string, ServerConnection>;
  /** Registered tools on the workbench server for this toolbox */
  registeredTools: Map<string, RegisteredTool>;
  opened_at: Date;
}
```

**Purpose**: Type definitions for configuration and runtime state

**Removal Action**:
- Remove `toolMode` field from `WorkbenchConfig`
- Remove `registeredTools` field from `OpenedToolbox`
- Remove `RegisteredToolInfo` type (lines 64-78) if no longer used

---

## 2. Proxy Mode Verification

### 2.1 Proxy Mode Tool: `workbench_use_tool`

**File**: `/Users/gleb/Projects/mcp-workbench/src/index.ts`
**Lines**: 282-354

**Status**: ✅ Fully functional

**How It Works**:
1. Accepts `toolbox_name`, `tool_name`, and `arguments`
2. Calls `ClientManager.findToolInToolbox()` to locate tool
3. Delegates to downstream server via `connection.client.callTool()`
4. Returns downstream response directly

**Code Snippet**:
```typescript
this.server.registerTool(
  "workbench_use_tool",
  { /* schema */ },
  async (args: { [x: string]: any }) => {
    const params = args as UseToolInput;
    try {
      // Find the tool in the opened toolbox
      const { connection, tool } = this.clientManager.findToolInToolbox(
        params.toolbox_name,
        params.tool_name
      );

      // Delegate to the downstream server
      const result = await connection.client.callTool({
        name: tool.name,
        arguments: params.arguments,
      });

      return result;
    } catch (error) {
      // Error handling
    }
  }
);
```

**Independence**: No dependencies on dynamic mode - operates purely on opened toolbox connections

---

### 2.2 Tool Discovery: `workbench_open_toolbox`

**File**: `/Users/gleb/Projects/mcp-workbench/src/index.ts`
**Lines**: 240-244, 249-254

**Status**: ✅ Returns full tool schemas in proxy mode

**How It Works**:
1. Opens toolbox (connects to downstream servers)
2. Calls `ClientManager.openToolbox()` which returns tools array
3. Returns `OpenToolboxResult` with complete tool list including schemas

**Code Snippet**:
```typescript
const { connections, tools } = await this.clientManager.openToolbox(
  params.toolbox_name,
  toolboxConfig,
  this.server
);

const result: OpenToolboxResult = {
  toolbox: params.toolbox_name,
  description: toolboxConfig.description,
  servers_connected: connections.size,
  tools,  // Full tool list with schemas
};
```

**Tool Schema Building**:
```typescript
// In ClientManager.getToolsFromConnections()
for (const [serverName, connection] of connections) {
  for (const tool of connection.tools) {
    const prefixedName = this.generateToolName(toolboxName, serverName, tool.name);

    tools.push({
      ...tool,
      name: prefixedName,  // Prefixed name
      description: tool.description
        ? `[${toolboxName}/${serverName}] ${tool.description}`
        : `Tool from ${toolboxName}/${serverName}`,
      source_server: serverName,
      toolbox_name: toolboxName,
      _meta: {
        ...tool._meta,
        source_server: serverName,
        toolbox_name: toolboxName,
        original_name: tool.name,
      },
    });
  }
}
```

**Independence**: Works identically in both modes - tool list returned regardless of registration

---

### 2.3 Tool Routing: `findToolInToolbox`

**File**: `/Users/gleb/Projects/mcp-workbench/src/client-manager.ts`
**Lines**: 462-503

**Status**: ✅ Fully functional for proxy mode

**How It Works**:
1. Looks up toolbox in `openedToolboxes` map
2. Parses tool name to extract server prefix
3. Finds server connection and original tool in connection's tool list
4. Returns `{ connection, tool }` for delegation

**Code Snippet**:
```typescript
findToolInToolbox(toolboxName: string, toolName: string): { connection: ServerConnection; tool: Tool } {
  const toolbox = this.openedToolboxes.get(toolboxName);
  if (!toolbox) {
    throw new Error(`Toolbox '${toolboxName}' is not currently open.`);
  }

  // Parse server prefix: format is {serverName}_{originalToolName}
  const underscoreIndex = toolName.indexOf('_');

  if (underscoreIndex > 0) {
    const potentialServer = toolName.substring(0, underscoreIndex);
    const connection = toolbox.connections.get(potentialServer);

    if (connection) {
      const originalToolName = toolName.substring(underscoreIndex + 1);
      const tool = connection.tools.find(t => t.name === originalToolName);

      if (tool) {
        return { connection, tool };
      }
    }
  }

  // Fallback: search all connections
  // ...
}
```

**Independence**: Uses only `connections` map, no dependency on `registeredTools`

---

## 3. Tool Name References

### 3.1 Source Code References

**Search Pattern**: `workbench_open_toolbox`

**Files Found** (28 total):
- `/Users/gleb/Projects/mcp-workbench/src/index.ts` - Tool registration (line 210)
- `/Users/gleb/Projects/mcp-workbench/src/client-manager.ts` - Comments (line 465)
- `/Users/gleb/Projects/mcp-workbench/CLAUDE.md` - Documentation (multiple occurrences)
- `/Users/gleb/Projects/mcp-workbench/README.md` - Documentation (multiple occurrences)
- `/Users/gleb/Projects/mcp-workbench/TESTING.md` - Test documentation
- `/Users/gleb/Projects/mcp-workbench/test-duplicate-tools.sh` - Test script
- Spec files (001-005) - Historical documentation

**Critical Updates Required**:
1. `src/index.ts` line 210: Tool registration name
2. `src/index.ts` lines 119-207: Tool descriptions
3. `src/client-manager.ts` line 465: Error message
4. `CLAUDE.md`: Multiple references in architecture documentation
5. `README.md`: All examples and workflow descriptions

---

**Search Pattern**: `workbench_use_tool`

**Files Found** (22 total):
- `/Users/gleb/Projects/mcp-workbench/src/index.ts` - Tool registration (line 283)
- `/Users/gleb/Projects/mcp-workbench/src/types.ts` - Type documentation (line 49)
- `/Users/gleb/Projects/mcp-workbench/CLAUDE.md` - Documentation (multiple occurrences)
- `/Users/gleb/Projects/mcp-workbench/README.md` - Documentation (multiple occurrences)
- Spec files and test configurations

**Critical Updates Required**:
1. `src/index.ts` line 283: Tool registration name
2. `src/index.ts` lines 119-207, 286-315: Tool descriptions
3. `src/types.ts` line 49: Type documentation comment
4. `CLAUDE.md`: Workflow and architecture sections
5. `README.md`: All examples and workflow descriptions

---

**Search Pattern**: `workbench_list_toolboxes`

**Files Found** (23 total):
- Spec files (004-005) - Historical documentation (already removed in feature 005)
- No active source code references

**Status**: ✅ Already removed in feature 005-init-instructions-toolboxes

---

**Search Pattern**: `workbench_close_toolbox`

**Files Found** (0 active references):
- Spec files only (004) - Historical documentation

**Status**: ✅ Already removed in feature 004-remove-manual-close

---

### 3.2 Configuration File References

**File**: `/Users/gleb/Projects/mcp-workbench/workbench-config.test-proxy.json`

```json
{
  "toolMode": "proxy",
  "toolboxes": {
    "test-memory": { /* ... */ }
  }
}
```

**Status**: Will continue to work (field ignored in proxy-only mode)

**Action**: Update comment to indicate field is deprecated but ignored

---

**File**: `/Users/gleb/Projects/mcp-workbench/workbench-config.example.json`

```json
{
  "_comment": "Example workbench configuration showing environment variable expansion",
  "toolMode": "dynamic",
  "toolboxes": { /* ... */ }
}
```

**Status**: Will fail validation (dynamic mode rejected)

**Action**: Remove `toolMode` field or change to "proxy" (though field is now redundant)

---

## 4. Breaking Changes Documentation

### 4.1 User-Facing API Changes

**Change 1: Meta-Tool Renaming**

| Old Name (v0.9.0) | New Name (v0.10.0) | Change Type |
|-------------------|-------------------|-------------|
| `workbench_open_toolbox` | `open_toolbox` | Rename |
| `workbench_use_tool` | `use_tool` | Rename |
| `workbench_list_toolboxes` | *(removed in v0.9.0)* | N/A |
| `workbench_close_toolbox` | *(removed in v0.9.0)* | N/A |

**Impact**: All MCP client code calling these tools must update tool names

---

**Change 2: Dynamic Tool Registration Removed**

**Before (v0.9.0 dynamic mode)**:
```typescript
// Tools appear directly in MCP client tool list
main__filesystem__read_file({ path: "test.txt" })
```

**After (v0.10.0 proxy-only mode)**:
```typescript
// All tools invoked via use_tool meta-tool
use_tool({
  toolbox_name: "main",
  tool_name: "main__filesystem__read_file",
  arguments: { path: "test.txt" }
})
```

**Impact**: Users relying on dynamic mode (default in v0.9.0) must update all tool calls

---

**Change 3: Configuration Schema**

**Before (v0.9.0)**:
```json
{
  "toolMode": "dynamic",  // or "proxy"
  "toolboxes": { /* ... */ }
}
```

**After (v0.10.0)**:
```json
{
  // toolMode field removed (proxy mode implicit)
  "toolboxes": { /* ... */ }
}
```

**Validation Rules**:
- No `toolMode` field: ✅ Works (implicit proxy mode)
- `"toolMode": "proxy"`: ✅ Works (field ignored)
- `"toolMode": "dynamic"`: ❌ Fails validation with error

**Impact**: Configurations with `"toolMode": "dynamic"` must be updated

---

**Change 4: Open Toolbox Response Format**

**Before (v0.9.0 dynamic mode)**:
```json
{
  "toolbox": "main",
  "description": "...",
  "servers_connected": 2,
  "tools_registered": 15,  // Count only
  "message": "Tools registered"
}
```

**After (v0.10.0 proxy-only mode)**:
```json
{
  "toolbox": "main",
  "description": "...",
  "servers_connected": 2,
  "tools": [  // Full tool list with schemas
    {
      "name": "main__filesystem__read_file",
      "source_server": "filesystem",
      "toolbox_name": "main",
      "description": "...",
      "inputSchema": { /* ... */ },
      "annotations": { /* ... */ }
    }
    // ... more tools
  ]
}
```

**Impact**: Code parsing `open_toolbox` response must handle array instead of count

---

### 4.2 Migration Guide Bullet Points

**For Users (MCP Client Operators)**:

1. **Update Configuration Files**
   - Remove `"toolMode": "dynamic"` or change to `"toolMode": "proxy"` (field now redundant)
   - Configurations without `toolMode` will work automatically in proxy mode

2. **Update Tool Invocations**
   - Change all `workbench_open_toolbox` calls to `open_toolbox`
   - Change all `workbench_use_tool` calls to `use_tool`
   - If using dynamic mode (tools called directly), wrap calls in `use_tool`

3. **Update Response Parsing**
   - `open_toolbox` now returns full tool array, not just count
   - Extract tool schemas from response for downstream invocations

4. **Test Thoroughly**
   - Verify all toolboxes open successfully
   - Verify all tool invocations work via `use_tool`
   - Check initialization instructions for toolbox discovery

**For Developers (Integrators)**:

1. **Review Type Definitions**
   - `WorkbenchConfig` no longer has `toolMode` field
   - `OpenedToolbox` no longer has `registeredTools` field
   - `OpenToolboxResult` always includes full `tools` array

2. **Update Client Code**
   - Remove any conditional logic based on `toolMode`
   - Assume proxy-only operation
   - Parse tool list from `open_toolbox` response

3. **Update Documentation**
   - Remove references to dynamic mode
   - Update architecture diagrams
   - Update example code snippets

---

## 5. Decision Summary & Removal Approach

### 5.1 Safest Removal Strategy

**Recommended Approach: Bottom-Up Cleanup**

**Phase 1: Remove Dynamic-Specific Logic**
1. Delete `ClientManager.registerToolsOnServer()` method (lines 276-376)
2. Delete `ClientManager.unregisterToolsFromServer()` method (lines 381-395)
3. Remove `registeredTools` field from `OpenedToolbox` type
4. Remove registration call in `ClientManager.openToolbox()` (lines 190-193)

**Phase 2: Update Configuration Handling**
1. Update `config-loader.ts` to reject `"toolMode": "dynamic"` with clear error
2. Remove `toolMode` field from `WorkbenchConfig` type definition
3. Update example configurations to remove field

**Phase 3: Simplify Meta-Tool Registration**
1. Remove `toolMode` conditional from `open_toolbox` description (line 119)
2. Remove `toolMode` conditional around `use_tool` registration (line 281)
3. Remove `sendToolListChanged()` call (line 247)
4. Rename tools: `workbench_open_toolbox` → `open_toolbox`, `workbench_use_tool` → `use_tool`

**Phase 4: Update Documentation**
1. Update `CLAUDE.md`: Remove dynamic mode architecture section
2. Update `README.md`: Remove dynamic mode examples, update all tool names
3. Update `CHANGELOG.md`: Add v0.10.0 entry with breaking changes
4. Update `.specify/memory/constitution.md`: Revise Principles I and III
5. Update spec files if needed

**Phase 5: Testing**
1. Test with `workbench-config.test-proxy.json`
2. Verify `open_toolbox` returns full tool list
3. Verify `use_tool` routes correctly to downstream servers
4. Verify configuration validation rejects dynamic mode

---

### 5.2 Risk Mitigation

**Risk 1: Incomplete Removal**
- **Mitigation**: Search codebase for `registeredTools`, `registerToolsOnServer`, `toolMode` after implementation
- **Verification**: TypeScript compilation should catch any remaining references

**Risk 2: Proxy Mode Regression**
- **Mitigation**: Test proxy mode thoroughly with real downstream servers before removal
- **Verification**: Run existing test suite with proxy mode configuration

**Risk 3: Documentation Drift**
- **Mitigation**: Use grep to find all documentation references before and after
- **Verification**: Search for "dynamic", "proxy", "workbench_" in all markdown files

**Risk 4: Breaking User Deployments**
- **Mitigation**: Clear error messages for invalid configurations, comprehensive migration guide
- **Verification**: Version bump to 0.10.0, detailed CHANGELOG entry

---

### 5.3 Code Metrics

**Lines of Code to Remove**: ~300 LOC
- `registerToolsOnServer()`: ~100 lines
- `unregisterToolsFromServer()`: ~15 lines
- Conditional logic and comments: ~50 lines
- Type definitions: ~30 lines
- Documentation: ~100+ lines

**Files to Modify**: 4 source files + 6+ documentation files
- Source: `index.ts`, `client-manager.ts`, `config-loader.ts`, `types.ts`
- Docs: `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `constitution.md`, configs

**Test Configurations to Update**: 2 files
- `workbench-config.example.json`: Remove `toolMode` field
- `workbench-config.test-proxy.json`: Add deprecation comment

---

### 5.4 Final Recommendation

**Proceed with removal using bottom-up cleanup approach**

**Rationale**:
1. ✅ Proxy mode is fully functional and independent
2. ✅ Dynamic mode code is well-isolated and can be cleanly removed
3. ✅ Tool naming convention remains unchanged (prefixed format retained)
4. ✅ Breaking change acceptable in pre-1.0.0 incubation phase
5. ✅ Simplifies codebase maintenance going forward
6. ⚠️ Impacts most users (dynamic mode is default) - requires clear migration guide

**Prerequisites**:
- Update constitution principles I and III before implementation
- Prepare comprehensive migration guide with before/after examples
- Create detailed CHANGELOG entry explaining breaking changes

**Post-Implementation Verification**:
- Test with real downstream MCP servers (filesystem, memory)
- Verify all documentation updated
- Confirm no TypeScript compilation errors
- Grep for remaining "dynamic", "toolMode", "registeredTools" references

---

## Appendices

### A. Tool Name Format Reference

**Current Format (Unchanged)**: `{toolbox}__{server}__{tool}`

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem__read_file`
- Toolbox "prod", server "clickhouse", tool "query" → `prod__clickhouse__query`

**Note**: This format is retained in v0.10.0 - only the meta-tool names change (drop `workbench_` prefix)

---

### B. Configuration Examples

**Valid Configuration (v0.10.0)**:
```json
{
  "toolboxes": {
    "main": {
      "description": "Main toolbox",
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem"]
        }
      }
    }
  }
}
```

**Invalid Configuration (v0.10.0)**:
```json
{
  "toolMode": "dynamic",  // ❌ Will fail validation
  "toolboxes": { /* ... */ }
}
```

**Expected Error Message**:
```
Configuration field 'toolMode' set to 'dynamic' is no longer supported.
Dynamic mode was removed in version 0.10.0.
Please remove the 'toolMode' field or set it to 'proxy' (though proxy mode is now implicit).
For migration guidance, see: [link to migration guide]
```

---

### C. Grep Commands for Verification

**After Implementation**, run these searches to verify complete removal:

```bash
# Check for remaining dynamic mode references
grep -r "toolMode" src/
grep -r "dynamic" src/ --include="*.ts"
grep -r "registeredTools" src/

# Check for old tool names
grep -r "workbench_open_toolbox" src/
grep -r "workbench_use_tool" src/

# Check documentation updates
grep -r "dynamic mode" *.md
grep -r "workbench_" *.md
```

**Expected Results**: No matches in source code, only historical references in spec files

---

**Research Status**: ✅ Complete
**Ready for**: Phase 1 (Design & Contracts) via `/speckit.plan` execution
**Critical Path**: Update constitution before implementation (Principles I and III)
