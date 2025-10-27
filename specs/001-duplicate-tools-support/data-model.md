# Data Model: Support Multiple Toolboxes with Duplicate Tools

**Date**: 2025-10-27
**Feature**: 001-duplicate-tools-support

## Overview

This feature extends the existing in-memory data model to support multiple toolboxes with duplicate server instances. The model maintains strict isolation between toolbox instances while enabling unique tool addressing through enhanced naming.

## Core Entities

### ToolInfo (Extended)

**Purpose**: Represents metadata about a tool, including its source and ownership context

**Current Definition** ([src/types.ts:55-60](../../src/types.ts#L55-L60)):
```typescript
export interface ToolInfo extends Tool {
  source_server: string;    // e.g., "filesystem"
  toolbox_name: string;      // e.g., "dev"
}
```

**Changes Required**: None - already includes `toolbox_name` field

**Example Instance**:
```typescript
{
  name: "read_file",           // Original tool name from downstream server
  source_server: "filesystem",
  toolbox_name: "dev",
  description: "Read a file from the filesystem",
  inputSchema: { /* JSON Schema */ }
}
```

**Validation Rules**:
- `source_server` must match a key in the owning toolbox's `connections` map
- `toolbox_name` must not contain double underscores `__`
- `name` (original tool name) must be preserved for delegation

---

### RegisteredToolInfo (Extended)

**Purpose**: Tracks metadata about tools registered on the workbench server

**Current Definition** ([src/types.ts:75-86](../../src/types.ts#L75-L86)):
```typescript
export interface RegisteredToolInfo {
  name: string;              // Prefixed tool name
  original_name: string;     // Original tool name
  server: string;            // Source server name
  description?: string;
  title?: string;
}
```

**Changes Required**: Add `toolbox_name` field

**Updated Definition**:
```typescript
export interface RegisteredToolInfo {
  name: string;              // e.g., "dev__filesystem_read_file"
  original_name: string;     // e.g., "read_file"
  server: string;            // e.g., "filesystem"
  toolbox_name: string;      // e.g., "dev" (NEW)
  description?: string;
  title?: string;
}
```

**Example Instance**:
```typescript
{
  name: "dev__filesystem_read_file",
  original_name: "read_file",
  server: "filesystem",
  toolbox_name: "dev",
  description: "[dev/filesystem] Read a file from the filesystem"
}
```

**Naming Format**: `{toolbox_name}__{server}_{original_name}`
- Delimiter: Double underscore `__` between toolbox and server
- Single underscore `_` between server and tool (unchanged)

**Validation Rules**:
- `name` format must match pattern: `^[^_]+__[^_]+_.+$`
- `toolbox_name` must not contain `__`
- `server` must not contain `__`
- `name` should equal `${toolbox_name}__${server}_${original_name}`

---

### OpenedToolbox (Existing)

**Purpose**: Represents runtime state for an opened toolbox

**Current Definition** ([src/types.ts:118-125](../../src/types.ts#L118-L125)):
```typescript
export interface OpenedToolbox {
  name: string;
  config: ToolboxConfig;
  connections: Map<string, ServerConnection>;
  registeredTools: Map<string, RegisteredTool>;
  opened_at: Date;
}
```

**Changes Required**: None to structure, but keys in `registeredTools` map will use new format

**Key Changes**:
- `registeredTools` map keys will use `{toolbox}__{server}_{tool}` format instead of `{server}_{tool}`
- Multiple `OpenedToolbox` instances can have duplicate `connections` keys (same server name in different toolboxes)

**Example Instance**:
```typescript
{
  name: "dev",
  config: { /* ToolboxConfig */ },
  connections: Map {
    "filesystem" => { /* ServerConnection */ }
  },
  registeredTools: Map {
    "dev__filesystem_read_file" => RegisteredTool { /* opaque SDK type */ },
    "dev__filesystem_write_file" => RegisteredTool { /* opaque SDK type */ }
  },
  opened_at: Date("2025-10-27T12:00:00Z")
}
```

**Invariants**:
- Each `OpenedToolbox` maintains its own `connections` map (no sharing between toolboxes)
- All tools in `registeredTools` must be prefixed with this toolbox's `name`
- Server names in `connections` keys must match the server portion of `registeredTools` keys

---

### ServerConnection (Existing)

**Purpose**: Represents a connection to a downstream MCP server

**Current Definition** ([src/types.ts:100-113](../../src/types.ts#L100-L113)):
```typescript
export interface ServerConnection {
  name: string;              // Server identifier
  config: WorkbenchServerConfig;
  client: any;               // MCP Client instance
  transport: any;            // Transport instance
  tools: Tool[];             // Cached tools from server
  connected_at: Date;
}
```

**Changes Required**: None - connections remain isolated per toolbox

**Key Behavior**:
- Multiple `OpenedToolbox` instances can each have their own `ServerConnection` with the same `name`
- Each connection is independent (separate client, transport, cached tools)
- Connection lifecycle is tied to owning toolbox (closed when toolbox closes)

**Example Scenario** (Duplicate Servers):
```typescript
// Toolbox "dev" has a filesystem connection
openedToolboxes.get("dev").connections.get("filesystem") = {
  name: "filesystem",
  client: Client@0x1234,
  tools: [Tool{ name: "read_file" }, ...],
  ...
}

// Toolbox "prod" has its own filesystem connection
openedToolboxes.get("prod").connections.get("filesystem") = {
  name: "filesystem",
  client: Client@0x5678,  // Different client instance!
  tools: [Tool{ name: "read_file" }, ...],  // Same tools but independent cache
  ...
}
```

---

## Data Relationships

### Ownership Hierarchy

```
WorkbenchServer (singleton)
└── openedToolboxes: Map<string, OpenedToolbox>
    ├── "dev" => OpenedToolbox
    │   ├── connections: Map<string, ServerConnection>
    │   │   └── "filesystem" => ServerConnection
    │   │       └── tools: Tool[]
    │   │           └── { name: "read_file", ... }
    │   └── registeredTools: Map<string, RegisteredTool>
    │       └── "dev__filesystem_read_file" => RegisteredTool
    │
    └── "prod" => OpenedToolbox
        ├── connections: Map<string, ServerConnection>
        │   └── "filesystem" => ServerConnection  (DUPLICATE - independent instance)
        │       └── tools: Tool[]
        │           └── { name: "read_file", ... }
        └── registeredTools: Map<string, RegisteredTool>
            └── "prod__filesystem_read_file" => RegisteredTool
```

**Key Relationships**:
1. **One-to-Many**: One `WorkbenchServer` → Many `OpenedToolbox` instances
2. **One-to-Many**: One `OpenedToolbox` → Many `ServerConnection` instances
3. **One-to-Many**: One `ServerConnection` → Many `Tool` instances
4. **One-to-Many**: One `OpenedToolbox` → Many `RegisteredTool` instances
5. **Independent Duplicates**: Different `OpenedToolbox` instances can have `ServerConnection` instances with the same `name` but different `client`/`transport` instances

### Naming Relationships

```
Original Tool:     "read_file"
Server Name:       "filesystem"
Toolbox Name:      "dev"
                   ↓
Registered Name:   "dev__filesystem_read_file"
                   ↓
Tool Metadata:     { name: "dev__filesystem_read_file",
                     original_name: "read_file",
                     server: "filesystem",
                     toolbox_name: "dev" }
```

**Parsing Logic**:
```typescript
const registeredName = "dev__filesystem_read_file";
const [toolboxName, serverAndTool] = registeredName.split('__');
const firstUnderscoreIndex = serverAndTool.indexOf('_');
const serverName = serverAndTool.substring(0, firstUnderscoreIndex);
const originalName = serverAndTool.substring(firstUnderscoreIndex + 1);

// Result:
// toolboxName = "dev"
// serverName = "filesystem"
// originalName = "read_file"
```

---

## State Transitions

### Toolbox Lifecycle

```
[CLOSED]
   ↓ workbench_open_toolbox("dev")
   ↓ - Create OpenedToolbox instance
   ↓ - Connect to each server in config (create ServerConnection)
   ↓ - Query tools from each server
   ↓ - Register each tool with {toolbox}__{server}_{tool} name
   ↓ - Add RegisteredTool to registeredTools map
   ↓
[OPEN: dev]
   ↓ (Can open more toolboxes independently)
   ↓
[OPEN: dev, prod]  (duplicate servers allowed)
   ↓ workbench_close_toolbox("dev")
   ↓ - Iterate through dev.registeredTools
   ↓ - Call .remove() on each RegisteredTool
   ↓ - Close each connection in dev.connections
   ↓ - Remove OpenedToolbox from map
   ↓
[OPEN: prod]  (prod unaffected by dev closure)
```

### Tool Registration Lifecycle

```
[Tool discovered in ServerConnection.tools]
   ↓
   ↓ Registration in dynamic mode:
   ↓ - Prefix: name = `${toolbox.name}__${server.name}_${tool.name}`
   ↓ - Register: server.registerTool({ name, inputSchema, ... }, handler)
   ↓ - Store: toolbox.registeredTools.set(name, registeredTool)
   ↓
[Tool registered and callable]
   ↓
   ↓ Invocation:
   ↓ - MCP client calls tool by registered name
   ↓ - Handler parses name to extract toolbox, server, originalName
   ↓ - Handler looks up connection: toolbox.connections.get(server)
   ↓ - Handler delegates: connection.client.callTool({ name: originalName, ... })
   ↓ - Returns result or error
   ↓
[Tool still registered]
   ↓
   ↓ Unregistration (toolbox close):
   ↓ - Call registeredTool.remove()
   ↓ - SDK sends "tool list changed" notification
   ↓
[Tool removed]
```

---

## Validation Rules

### Toolbox Names

- MUST NOT contain double underscores `__`
- SHOULD be lowercase alphanumeric with hyphens (e.g., `dev`, `prod`, `staging-env`)
- MUST be unique across currently open toolboxes (enforced by Map key)

### Server Names

- MUST NOT contain double underscores `__`
- MUST match keys in toolbox's `config.mcpServers`
- CAN be duplicated across different toolboxes (allowed and expected)

### Tool Names (Registered)

- MUST follow format: `{toolbox}__{server}_{original}`
- MUST be parseable: `split('__')` yields exactly 2 parts
- First part (toolbox) MUST match owning toolbox's name
- Second part (server_tool) MUST contain at least one underscore

### Tool Names (Original)

- MUST be preserved from downstream server (no modification)
- MUST be used for delegation to downstream server
- MAY contain underscores, hyphens, alphanumerics

---

## Invariants

### Isolation Invariant

> For any two distinct toolboxes T1 and T2, their connection pools are completely independent:
> `T1.connections` and `T2.connections` may have overlapping keys, but the `ServerConnection` instances are distinct objects with separate `client` and `transport` instances.

**Verification**: Check that `T1.connections.get(k) !== T2.connections.get(k)` for any key `k`.

### Naming Uniqueness Invariant

> For any registered tool name `N` in the global tool registry, there is exactly one `RegisteredTool` instance.
> For any two distinct toolboxes T1 and T2 with the same server S and tool T, their registered names are distinct:
> `T1.registeredTools` has key `t1__s_t` and `T2.registeredTools` has key `t2__s_t` where `t1 !== t2`.

**Verification**: Check that all `registeredTools` map keys across all `openedToolboxes` are globally unique.

### Delegation Correctness Invariant

> For any registered tool with name `{toolbox}__{server}_{original}`, there exists:
> 1. An `OpenedToolbox` with `name === toolbox`
> 2. A `ServerConnection` in that toolbox's `connections` map with `name === server`
> 3. A `Tool` in that connection's `tools` array with `name === original`

**Verification**: Parse each registered tool name and verify the corresponding toolbox → connection → tool path exists.

---

## Example Scenarios

### Scenario 1: Single Toolbox (Backward Compatibility)

**Configuration**:
```json
{
  "toolboxes": {
    "main": {
      "description": "Main toolbox",
      "mcpServers": {
        "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }
      }
    }
  }
}
```

**State After Opening**:
```typescript
openedToolboxes = Map {
  "main" => {
    name: "main",
    connections: Map {
      "filesystem" => { name: "filesystem", tools: [{ name: "read_file" }, ...] }
    },
    registeredTools: Map {
      "main__filesystem_read_file" => RegisteredTool { ... }
      // Note: Uses {toolbox}__format even for single toolbox
    }
  }
}
```

**Registered Tool Names**:
- `main__filesystem_read_file`
- `main__filesystem_write_file`
- `main__filesystem_list_directory`
- ...

### Scenario 2: Multiple Toolboxes with Duplicate Servers

**Configuration**:
```json
{
  "toolboxes": {
    "dev": {
      "description": "Development environment",
      "mcpServers": {
        "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/dev"] }
      }
    },
    "prod": {
      "description": "Production environment",
      "mcpServers": {
        "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/var/prod"] }
      }
    }
  }
}
```

**State After Opening Both**:
```typescript
openedToolboxes = Map {
  "dev" => {
    name: "dev",
    connections: Map {
      "filesystem" => { name: "filesystem", config: { args: [..., "/tmp/dev"] }, ... }
    },
    registeredTools: Map {
      "dev__filesystem_read_file" => RegisteredTool { ... }
    }
  },
  "prod" => {
    name: "prod",
    connections: Map {
      "filesystem" => { name: "filesystem", config: { args: [..., "/var/prod"] }, ... }
    },
    registeredTools: Map {
      "prod__filesystem_read_file" => RegisteredTool { ... }
    }
  }
}
```

**Registered Tool Names**:
- `dev__filesystem_read_file` → delegates to dev's filesystem server (reads from `/tmp/dev`)
- `prod__filesystem_read_file` → delegates to prod's filesystem server (reads from `/var/prod`)
- Both coexist without conflicts!

---

## Performance Considerations

### Memory Overhead

**Per Toolbox**:
- 1 `OpenedToolbox` instance: ~1KB
- N `ServerConnection` instances: ~5KB each
- M `RegisteredTool` instances: ~2KB each (MCP SDK overhead)

**Example**: 10 toolboxes × 5 servers × 10 tools = 500 tools
- Toolboxes: 10KB
- Connections: 250KB
- Registered Tools: 1MB
- **Total**: ~1.3MB (acceptable for Node.js server)

### Lookup Performance

- `openedToolboxes.get(name)`: O(1) - Map lookup
- `toolbox.connections.get(serverName)`: O(1) - Map lookup
- `toolbox.registeredTools.get(toolName)`: O(1) - Map lookup
- Tool name parsing: O(n) where n = length of tool name (~50 chars) = negligible

**Critical Path** (tool invocation):
1. Parse tool name: ~1µs
2. Lookup toolbox: ~100ns (Map)
3. Lookup connection: ~100ns (Map)
4. Delegate to downstream: ~1-100ms (network/IPC)

**Conclusion**: Naming overhead is negligible compared to delegation cost.

---

## Migration Path

### From Current (0.3.3) to This Feature

**Existing Data**: Tools registered as `{server}_{tool}`
**New Data**: Tools registered as `{toolbox}__{server}_{tool}`

**Migration Strategy**: None required - feature introduces new naming on new registrations
- When feature is merged and server restarted, all tools are re-registered with new names
- No persistent state to migrate (all in-memory)
- Configuration files unchanged (same schema)

**User Impact**: Tool names will change - users must update their MCP client tool invocations
- Old: `filesystem_read_file`
- New: `main__filesystem_read_file` (assuming toolbox named "main")

**Mitigation**: Document in README.md and CHANGELOG.md with clear examples of before/after tool names.

---

## Summary

The data model changes are minimal:
1. **Type extension**: Add `toolbox_name` field to `RegisteredToolInfo`
2. **Naming format**: Change registered tool keys from `{server}_{tool}` to `{toolbox}__{server}_{tool}`
3. **Parsing logic**: Extract toolbox/server/tool components from registered name
4. **Isolation maintained**: Each toolbox maintains its own connections and registered tools (no sharing)

No new entities, no structural changes to existing types - just enhanced naming and metadata.
