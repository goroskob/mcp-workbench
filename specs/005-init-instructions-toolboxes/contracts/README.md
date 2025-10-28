# MCP Protocol Contracts

**Feature**: 005-init-instructions-toolboxes
**Date**: 2025-10-28

## Overview

This directory contains JSON Schema definitions for the MCP protocol messages affected by the initialization instructions feature.

## Files

### initialize-request.json

Standard MCP initialization request from client to server. **No changes** from standard MCP protocol.

**Key Points**:
- Client sends protocol version, capabilities, and client info
- Request format unchanged by this feature
- Compatible with all MCP clients

### initialize-response.json

Modified MCP initialization response from workbench to client. **New `instructions` field** added.

**Key Changes**:
- `instructions` field (string, optional) now populated with toolbox listings
- Plain text format with structured sections
- Includes toolbox names, server counts, descriptions, and usage guidance

**Format Examples**:

With toolboxes:
```
Available Toolboxes:

dev (3 servers)
  Description: Development environment tools

prod (2 servers)
  Description: Production monitoring tools

To access tools from a toolbox, use workbench_open_toolbox with the toolbox name.
```

Without toolboxes:
```
No toolboxes configured.

To configure toolboxes, add them to your workbench-config.json file.
See documentation for configuration format.
```

## Breaking Changes

### Removed: workbench_list_toolboxes Tool

**Before** (v0.x.x):
```json
// Client calls workbench_list_toolboxes tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "workbench_list_toolboxes",
    "arguments": {}
  }
}

// Server responds with toolbox list
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "toolboxes": [
      {
        "name": "dev",
        "description": "Development environment tools",
        "tool_count": 15,
        "servers_connected": 3,
        "is_open": false
      }
    ]
  }
}
```

**After** (v1.0.0+):
```json
// Client receives toolbox list during initialization
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "mcp-workbench", "version": "1.0.0" },
    "instructions": "Available Toolboxes:\n\ndev (3 servers)\n  Description: Development environment tools\n\nTo access tools from a toolbox, use workbench_open_toolbox with the toolbox name."
  }
}
```

**Migration Path**:
1. Parse `instructions` field from initialization response
2. Extract toolbox names and metadata from text (or display as-is)
3. Remove calls to `workbench_list_toolboxes` (will return "tool not found")

## Validation

### Request Validation (Unchanged)

Standard MCP initialization request validation:
- `protocolVersion` must be string
- `capabilities` must be object
- `clientInfo.name` and `clientInfo.version` required

### Response Validation (New)

Workbench initialization response must include:
- `instructions` field (string) with toolbox listings
- Plain text format with consistent structure
- No length limit enforced (practical limit ~50 toolboxes)

### Testing

Test cases for contracts:
1. ✅ Standard initialization with multiple toolboxes
2. ✅ Initialization with no toolboxes (empty config)
3. ✅ Initialization with toolbox missing description
4. ✅ Initialization with single toolbox
5. ✅ Verify `workbench_list_toolboxes` tool not in tools list

## Compatibility

### MCP Protocol Version

- **Minimum**: 2024-11-05 (or earlier versions supporting `instructions` field)
- **Current**: 2024-11-05
- **Future**: Compatible with future MCP versions (instructions field is optional)

### Client Compatibility

- ✅ **Claude Desktop**: Supports instructions field display
- ✅ **Custom MCP clients**: Instructions field is optional, can be ignored
- ❌ **Legacy workbench clients**: Must update to v1.0.0 API (breaking change)

### Server Compatibility

- ✅ **Downstream MCP servers**: No changes required
- ✅ **Workbench configuration**: No changes required

## Implementation Notes

### Server-Side (src/index.ts)

```typescript
// Initialization handler modification
async initialize(params: InitializeRequestParams): Promise<InitializeResult> {
  // ... existing protocol negotiation ...

  // NEW: Generate instructions from config
  const instructions = this.generateToolboxInstructions();

  return {
    protocolVersion: "2024-11-05",
    capabilities: this.capabilities,
    serverInfo: {
      name: "mcp-workbench",
      version: packageJson.version
    },
    instructions  // NEW: Include toolbox listings
  };
}

private generateToolboxInstructions(): string {
  const toolboxes = Object.entries(this.config.toolboxes);

  if (toolboxes.length === 0) {
    return "No toolboxes configured.\n\nTo configure toolboxes, add them to your workbench-config.json file.\nSee documentation for configuration format.";
  }

  const listings = toolboxes.map(([name, config]) => {
    const serverCount = Object.keys(config.mcpServers).length;
    const description = config.description || "No description provided";
    return `${name} (${serverCount} servers)\n  Description: ${description}`;
  }).join("\n\n");

  return `Available Toolboxes:\n\n${listings}\n\nTo access tools from a toolbox, use workbench_open_toolbox with the toolbox name.`;
}
```

### Client-Side (Example)

```typescript
// Connect to workbench
const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

// Initialize connection
const initResult = await client.initialize();

// NEW: Display instructions to user/agent
if (initResult.instructions) {
  console.log(initResult.instructions);
  // Or parse for programmatic use
}

// Proceed with workbench_open_toolbox calls
```

## References

- [MCP Specification - Lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle.md)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Workbench Feature Spec](../spec.md)
- [Workbench Data Model](../data-model.md)
