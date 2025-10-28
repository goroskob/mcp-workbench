# Data Model: Remove Manual Toolbox Closing

**Feature**: 004-remove-manual-close
**Date**: 2025-10-28

## Overview

This feature **does not introduce new entities or modify existing entity structures**. It simplifies the lifecycle management of existing entities by removing manual close operations. The data model below documents the existing entities and their updated lifecycle semantics.

---

## Entities

### OpenedToolbox

**Location**: [src/client-manager.ts](../../src/client-manager.ts) - `ClientManager.openedToolboxes` Map

**Description**: Runtime state tracking for an opened toolbox, including connections to all downstream MCP servers.

**Lifecycle Changes**:
- **Before**: Created on `open_toolbox`, deleted on `close_toolbox`
- **After**: Created on `open_toolbox`, deleted only on server shutdown

**Schema** (existing, no changes):

```typescript
{
  toolboxName: string;                    // Unique identifier
  connections: Map<string, ServerConnection>;  // Server name → connection
  registeredTools?: Map<string, Tool>;    // Only in dynamic mode
}
```

**Relationships**:
- Contains 1..N `ServerConnection` entries (one per MCP server in toolbox config)
- In dynamic mode, tracks N `registeredTools` (flattened from all servers)

**Validation Rules** (existing, no changes):
- `toolboxName` must exist in workbench configuration
- `connections` must not be empty (at least one server configured)

**State Transitions**:

```
[Closed] --open_toolbox--> [Open] --server_shutdown--> [Closed]
                                   (REMOVED: close_toolbox transition)
```

**Behavior Changes**:
- Multiple `open_toolbox` calls for same toolbox → **idempotent** (no-op if already open)
- Remains open indefinitely until server terminates

---

### ServerConnection

**Location**: [src/client-manager.ts](../../src/client-manager.ts)

**Description**: Active connection to a downstream MCP server within a toolbox.

**Lifecycle Changes**: Same as `OpenedToolbox` (deleted only on server shutdown, not on close)

**Schema** (existing, no changes):

```typescript
{
  client: Client;              // MCP SDK client instance
  transport: StdioClientTransport;  // Communication channel
  cachedTools: Tool[];         // Tools discovered from this server
}
```

**Relationships**:
- Owned by 1 `OpenedToolbox`
- References N `Tool` entries in `cachedTools`

**Cleanup Operations** (moved to shutdown):
1. Call `client.close()`
2. Call `transport.close()`
3. Remove from `OpenedToolbox.connections` map

---

## Lifecycle Summary

### Before This Feature

```
Server Start
    ↓
[List Toolboxes] ← User can query at any time
    ↓
[Open Toolbox] → Creates OpenedToolbox with ServerConnections
    ↓
[Use Tools] ← Normal operation
    ↓
[Close Toolbox] → Cleans up OpenedToolbox and ServerConnections ❌ REMOVED
    ↓
Server Shutdown → Cleanup any remaining connections (edge case)
```

### After This Feature

```
Server Start
    ↓
[List Toolboxes] ← User can query at any time
    ↓
[Open Toolbox] → Creates OpenedToolbox with ServerConnections (idempotent)
    ↓
[Use Tools] ← Normal operation (toolbox remains open)
    ↓
Server Shutdown → Cleanup ALL OpenedToolboxes and ServerConnections ✅ ENHANCED
```

---

## Data Integrity Constraints

**No new constraints.** Existing constraints remain:

1. **Unique Toolbox Names**: Only one `OpenedToolbox` entry per toolbox name at any time
   - **Enforcement**: Idempotent open checks `openedToolboxes.has(toolboxName)` before creating

2. **Valid Configuration**: All `ServerConnection` entries must reference servers defined in workbench config
   - **Enforcement**: Existing validation in `openToolbox()` method

3. **Complete Cleanup**: All resources must be freed on server shutdown
   - **Enforcement**: New `closeAllToolboxes()` method iterates through all open toolboxes

---

## Memory Management

**No changes to memory footprint calculation.** The number of concurrent `OpenedToolbox` entries is bounded by:
- Number of configured toolboxes (typically < 10)
- User behavior (not all toolboxes opened simultaneously in practice)

**Assumption** (from spec): Users work with a bounded number of toolboxes per session, not hundreds.

**Monitoring**: No built-in monitoring (out of scope). Users can restart server if memory is a concern.

---

## Concurrency Considerations

**No changes to concurrency model.** MCP SDK handles request serialization. Key points:

- Multiple tool calls can be active simultaneously (handled by MCP SDK)
- Open operations are idempotent (safe to call concurrently)
- Shutdown cleanup happens once, on process termination signals

**No explicit locking needed** - Node.js event loop provides sufficient serialization.

---

## Migration Impact

**No data migration required.** This is a runtime state change only:
- No persisted data affected
- No configuration schema changes
- Existing configurations continue to work without modification

**User Impact**:
- Users can no longer explicitly close toolboxes
- Server restart required to free toolbox resources
- Documented as breaking change with clear migration guidance
