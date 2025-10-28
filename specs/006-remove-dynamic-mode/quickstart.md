# Migration Guide: v0.9.0 → v0.10.0

## Breaking Changes Summary

MCP Workbench v0.10.0 removes dynamic mode support and renames meta-tools by dropping the `workbench_` prefix. This is a **breaking change** that affects how you interact with the workbench.

### What Changed

1. **Dynamic mode removed** - The workbench now operates exclusively in proxy mode
2. **Meta-tools renamed** - Dropped `workbench_` prefix for cleaner API
3. **Configuration simplified** - `toolMode` field deprecated (optional warning)

### Migration Checklist

- [ ] Update tool calls: `workbench_open_toolbox` → `open_toolbox`
- [ ] Update tool calls: `workbench_use_tool` → `use_tool`
- [ ] Remove or ignore `toolMode` field in configuration
- [ ] Update any scripts or automation using old tool names
- [ ] Verify toolbox discovery via initialization instructions

## Detailed Migration Steps

### 1. Update Configuration (Optional)

The `toolMode` field is now deprecated. You can safely remove it from your configuration.

**Before (v0.9.0):**
```json
{
  "toolMode": "dynamic",
  "toolboxes": {
    "main": {
      "description": "Primary development toolbox",
      "mcpServers": { /* ... */ }
    }
  }
}
```

**After (v0.10.0):**
```json
{
  "toolboxes": {
    "main": {
      "description": "Primary development toolbox",
      "mcpServers": { /* ... */ }
    }
  }
}
```

**Notes:**
- Configs with `"toolMode": "proxy"` still work (field ignored with warning)
- Configs with `"toolMode": "dynamic"` **fail** with clear error message
- Configs without `toolMode` work seamlessly

### 2. Update Tool Invocations

All meta-tools have been renamed by dropping the `workbench_` prefix.

#### Opening a Toolbox

**Before (v0.9.0):**
```typescript
// MCP client call
const result = await client.callTool({
  name: "workbench_open_toolbox",
  arguments: { toolbox_name: "main" }
});
```

**After (v0.10.0):**
```typescript
// MCP client call
const result = await client.callTool({
  name: "open_toolbox",
  arguments: { toolbox_name: "main" }
});
```

#### Using a Tool (Proxy Mode)

**Before (v0.9.0):**
```typescript
// Proxy mode invocation
const result = await client.callTool({
  name: "workbench_use_tool",
  arguments: {
    toolbox_name: "main",
    tool_name: "filesystem__read_file",
    arguments: { path: "/path/to/file" }
  }
});
```

**After (v0.10.0):**
```typescript
// Proxy mode invocation (same pattern, renamed tool)
const result = await client.callTool({
  name: "use_tool",
  arguments: {
    toolbox_name: "main",
    tool_name: "filesystem__read_file",
    arguments: { path: "/path/to/file" }
  }
});
```

#### Dynamic Mode Invocation (REMOVED)

**Before (v0.9.0 dynamic mode):**
```typescript
// Dynamic mode - tools were registered directly
const result = await client.callTool({
  name: "main__filesystem__read_file",
  arguments: { path: "/path/to/file" }
});
```

**After (v0.10.0):**
```typescript
// Dynamic mode no longer supported - use proxy mode instead
const result = await client.callTool({
  name: "use_tool",
  arguments: {
    toolbox_name: "main",
    tool_name: "filesystem__read_file",
    arguments: { path: "/path/to/file" }
  }
});
```

### 3. Toolbox Discovery

Toolbox discovery now happens exclusively via initialization instructions (no more `workbench_list_toolboxes`).

**Before (v0.9.0):**
```typescript
// Had to call workbench_list_toolboxes
const toolboxes = await client.callTool({
  name: "workbench_list_toolboxes",
  arguments: {}
});
```

**After (v0.10.0):**
```typescript
// Toolbox information available in initialization response
const initResponse = await client.initialize({
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "my-client", version: "1.0.0" }
});

// Instructions field contains toolbox listing
console.log(initResponse.instructions);
// Output:
// Available toolboxes:
//
// main (3 tools from 2 servers)
// Primary development toolbox
//
// Use open_toolbox to connect to a toolbox, then use_tool to invoke tools.
```

### 4. Response Format Changes

The `open_toolbox` response format is now consistent (always returns full tool list).

**Before (v0.9.0 dynamic mode):**
```json
{
  "toolbox": "main",
  "description": "Primary development toolbox",
  "servers_connected": 2,
  "tools_registered": 3
}
```

**Before (v0.9.0 proxy mode):**
```json
{
  "toolbox": "main",
  "description": "Primary development toolbox",
  "servers_connected": 2,
  "tools": [
    {
      "name": "filesystem__read_file",
      "description": "[filesystem] Read file contents",
      "inputSchema": { /* ... */ }
    }
  ]
}
```

**After (v0.10.0):**
```json
{
  "toolbox": "main",
  "description": "Primary development toolbox",
  "servers_connected": 2,
  "tools": [
    {
      "name": "filesystem__read_file",
      "description": "[filesystem] Read file contents",
      "inputSchema": { /* ... */ }
    }
  ]
}
```

## Common Issues & Solutions

### Issue: "Dynamic mode is no longer supported"

**Error Message:**
```
Dynamic mode is no longer supported as of v0.10.0.
Please remove the "toolMode" field from your configuration.
The workbench now operates exclusively in proxy mode.
```

**Solution:**
Remove `"toolMode": "dynamic"` from your configuration file, or change it to `"toolMode": "proxy"` (though this is now redundant).

### Issue: "Tool not found: workbench_open_toolbox"

**Error Message:**
```
Tool not found: workbench_open_toolbox
```

**Solution:**
Update tool name to `open_toolbox` (no `workbench_` prefix).

### Issue: "Tool not found: workbench_use_tool"

**Error Message:**
```
Tool not found: workbench_use_tool
```

**Solution:**
Update tool name to `use_tool` (no `workbench_` prefix).

### Issue: Tool invocation fails after migration

**Possible Cause:**
You may be trying to call tools using dynamic mode pattern (direct prefixed names).

**Solution:**
Use the proxy pattern: call `use_tool` with `toolbox_name`, `tool_name`, and `arguments`.

## Upgrade Path

### Step 1: Install v0.10.0

```bash
npm install mcp-workbench@0.10.0
```

### Step 2: Update Configuration

Remove or update `toolMode` field in `workbench-config.json`.

### Step 3: Update Client Code

Search and replace in your codebase:
- `workbench_open_toolbox` → `open_toolbox`
- `workbench_use_tool` → `use_tool`

### Step 4: Test

Start the workbench and verify:
1. Server starts without configuration errors
2. Toolbox discovery works via initialization instructions
3. `open_toolbox` returns tool schemas
4. `use_tool` executes tools successfully

### Step 5: Remove Dynamic Mode Logic (if applicable)

If your client code had dynamic mode-specific logic, remove it:

```typescript
// REMOVE: Dynamic mode tool registration handling
client.on('toolListChanged', () => {
  // No longer emitted
});

// REMOVE: Direct tool invocation (dynamic mode)
await client.callTool({ name: "main__filesystem__read_file", /* ... */ });
```

## Rollback Instructions

If you encounter issues with v0.10.0, you can rollback to v0.9.0:

```bash
npm install mcp-workbench@0.9.0
```

**Note:** v0.9.0 is the last version supporting dynamic mode. Please report any migration issues at: https://github.com/hlibkoval/mcp-workbench/issues

## Benefits of This Change

1. **Simpler API** - Two meta-tools instead of three, cleaner naming
2. **Reduced complexity** - Single code path, easier to maintain and debug
3. **Better compatibility** - Proxy mode works with all MCP clients (no dynamic registration support needed)
4. **Clearer mental model** - Explicit tool invocation via `use_tool` is more predictable

## Need Help?

- **Documentation**: https://github.com/hlibkoval/mcp-workbench#readme
- **Issues**: https://github.com/hlibkoval/mcp-workbench/issues
- **Changelog**: https://github.com/hlibkoval/mcp-workbench/blob/main/CHANGELOG.md

---

**Migration Guide Version**: 1.0
**Target Versions**: 0.9.0 → 0.10.0
**Last Updated**: 2025-10-28
