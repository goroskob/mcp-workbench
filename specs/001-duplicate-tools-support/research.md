# Research: Support Multiple Toolboxes with Duplicate Tools

**Date**: 2025-10-27
**Feature**: 001-duplicate-tools-support
**Status**: Complete

## Research Questions

### Q1: Tool Naming Pattern for Toolbox-Scoped Tools

**Context**: Need to extend existing `{server}_{tool}` naming to include toolbox context while maintaining backward compatibility.

**Question**: What is the best delimiter pattern for `{toolbox}__{server}_{tool}` naming?

**Research**:
- Examined existing codebase in [src/client-manager.ts](../../src/client-manager.ts) - uses single underscore `_` for `{server}_{tool}`
- MCP SDK (from @modelcontextprotocol/sdk) does not enforce specific naming conventions
- Tool names are strings with no reserved characters in MCP protocol
- Common delimiter patterns in similar systems:
  - Double underscore `__`: Clear visual separation, uncommon in tool names, easy to parse
  - Slash `/`: Used in namespacing (e.g., Docker images), but may conflict with path-like tools
  - Dot `.`: Used in domain names, but common in method names (e.g., `file.read`)
  - Colon `:`: Used in Docker tags, but may conflict with protocol-like tools

**Decision**: Use double underscore `__` as the delimiter

**Rationale**:
- **Clear visual separation**: `dev__filesystem_read_file` vs. `dev_filesystem_read_file` - the double underscore creates a clear boundary between toolbox and server
- **Easy parsing**: `String.split('__')` reliably extracts toolbox and server+tool portions
- **Low collision risk**: Double underscores are rare in typical tool/server names
- **Reversible**: Can easily reconstruct original `{server}_{tool}` by splitting on `__` and re-joining the right portion
- **Consistent with assumption**: Spec already assumes toolbox names won't contain `__` (documented in assumptions)

**Alternatives Considered**:
- Single underscore: Rejected - cannot distinguish `toolbox_server_tool` (which underscore is the delimiter?)
- Slash `/`: Rejected - may conflict with file path tools, harder to use in some contexts (URLs, CLIs)
- Dot `.`: Rejected - common in method naming, could cause confusion
- Colon `:`: Rejected - may require escaping in some contexts

**Implementation Note**: Tool descriptions should use `[toolbox/server]` prefix format for clarity (e.g., `[dev/filesystem] Read a file`).

---

### Q2: Backward Compatibility Strategy

**Context**: Existing single-toolbox configurations currently use `{server}_{tool}` naming. Need to ensure they continue working.

**Question**: How should the system handle backward compatibility for single-toolbox configurations?

**Research**:
- Current implementation in [src/client-manager.ts:224](../../src/client-manager.ts#L224) uses `${serverName}_${tool.name}` prefix
- Toolbox names are known at registration time (part of `OpenedToolbox` state)
- No global registry of tool names across toolboxes - each toolbox maintains its own `registeredTools` map

**Decision**: Always use `{toolbox}__{server}_{tool}` format, even for single toolbox

**Rationale**:
- **Consistency**: Same naming pattern regardless of how many toolboxes are open
- **Predictability**: Tool names don't change based on global state (number of toolboxes)
- **Simplicity**: No conditional logic for single vs. multiple toolbox scenarios
- **Future-proof**: If a second toolbox is opened later, existing tool names remain unchanged
- **Clear ownership**: Tool name always indicates which toolbox it belongs to

**Alternatives Considered**:
- Conditional naming (use `{server}_{tool}` for single, `{toolbox}__{server}_{tool}` for multiple): Rejected - creates confusion when tool names change dynamically, breaks predictability
- Migration flag: Rejected - adds complexity, user burden, and potential for misconfiguration

**Implementation Note**: Update tool metadata to always include `toolbox_name` field. Update documentation to reflect new canonical naming pattern.

---

### Q3: Tool Registration State Management

**Context**: Need to track which toolbox owns which registered tools to enable independent unregistration on toolbox close.

**Question**: What data structure should track tool ownership for proper lifecycle management?

**Research**:
- Examined [src/types.ts:118-125](../../src/types.ts#L118-L125) - `OpenedToolbox` already has `registeredTools: Map<string, RegisteredTool>`
- `RegisteredTool` is from MCP SDK - opaque type with `.remove()` method
- Each toolbox maintains its own connection pool via `connections: Map<string, ServerConnection>`
- Current implementation in [src/client-manager.ts](../../src/client-manager.ts) uses `this.openedToolboxes: Map<string, OpenedToolbox>`

**Decision**: Maintain existing `OpenedToolbox.registeredTools` map structure, with toolbox-prefixed keys

**Rationale**:
- **Already isolated per toolbox**: Each `OpenedToolbox` has its own `registeredTools` map
- **Clean lifecycle**: When closing a toolbox, iterate through its `registeredTools` map and call `.remove()` on each
- **No global conflicts**: Different toolboxes can have `dev__filesystem_read_file` and `prod__filesystem_read_file` in their respective maps
- **Minimal changes**: Existing structure already supports the requirements; just need to update the key format

**Alternatives Considered**:
- Global registry with toolbox ownership metadata: Rejected - adds complexity, breaks encapsulation
- Prefix-based filtering on global registry: Rejected - error-prone, doesn't leverage existing structure

**Implementation Note**: Update key format in `registeredTools` map from `{server}_{tool}` to `{toolbox}__{server}_{tool}`. No structural changes needed.

---

### Q4: Tool Delegation and Routing

**Context**: When a tool is invoked with `{toolbox}__{server}_{tool}` name, need to route to the correct downstream server.

**Question**: How should the system extract toolbox, server, and original tool name from the registered tool name for delegation?

**Research**:
- Current delegation in [src/client-manager.ts](../../src/client-manager.ts) - tool handler accesses server connection from `OpenedToolbox.connections` map
- Tool handler receives the registered tool name as parameter
- Need to map from `{toolbox}__{server}_{tool}` back to original tool name for MCP SDK `client.callTool()`

**Decision**: Parse registered tool name in handler, store original name in tool metadata

**Rationale**:
- **Parsing strategy**: `toolName.split('__')` yields `[toolbox, serverAndTool]`, then `serverAndTool.split('_', 1)` yields `[server, originalTool]`
- **Metadata storage**: Extend `ToolInfo` type to include `original_name` field (already exists per [src/types.ts:55-60](../../src/types.ts#L55-L60))
- **Lookup efficiency**: Handler knows which toolbox it belongs to (stored in closure), can directly access `openedToolbox.connections.get(serverName)`
- **Error context**: Parsing failures can include full tool name in error message for debugging

**Alternatives Considered**:
- Store mapping table: Rejected - duplicates information already in tool name, adds memory overhead
- Use tool metadata only (no parsing): Rejected - tool name parsing is more reliable than metadata lookup
- Regex parsing: Rejected - overkill for simple delimiter-based format

**Implementation Note**: Update tool registration to store `original_name` in metadata. Update handler to parse tool name and extract components. Validate that parsed server name exists in toolbox's connection pool.

---

### Q5: Error Isolation Between Duplicate Server Instances

**Context**: Multiple toolboxes may have the same server. If one toolbox's server connection fails, others should be unaffected.

**Question**: What error handling pattern ensures isolation between duplicate server instances?

**Research**:
- Current error handling in [src/client-manager.ts](../../src/client-manager.ts) - connection errors during `openToolbox` trigger cleanup
- Each toolbox maintains separate `ServerConnection` instances (no sharing)
- Tool execution errors are wrapped and returned with `isError: true`

**Decision**: Maintain strict connection isolation - no shared state between duplicate servers

**Rationale**:
- **Separate connections**: Each `OpenedToolbox.connections` map creates independent `Client` instances
- **Independent lifecycle**: Connection failure in one toolbox doesn't affect others
- **Error context**: Include toolbox name in all error messages to distinguish duplicate instances
- **No cascading failures**: Tool execution errors are scoped to the specific toolbox/server/tool

**Alternatives Considered**:
- Connection pooling/sharing: Rejected - violates requirement FR-003 (separate instances per toolbox), complicates error isolation
- Global error registry: Rejected - unnecessary complexity, breaks encapsulation

**Implementation Note**: Ensure all error messages include toolbox context. Update error wrapping to format: `[toolbox/server/tool] error message`. No changes to connection isolation logic needed.

---

## Technology Choices

### TypeScript Type System Updates

**Decision**: Extend existing types in [src/types.ts](../../src/types.ts) rather than creating new type hierarchies

**Rationale**:
- Minimal changes to maintain backward compatibility
- Existing types already support the required functionality
- Strong typing with TypeScript strict mode catches errors at compile time

**Changes Required**:
- `ToolInfo.toolbox_name`: Already exists (line 59)
- `RegisteredToolInfo`: May need `toolbox_name` field for metadata
- No new types needed - extend existing interfaces

---

### MCP SDK Usage Patterns

**Decision**: Continue using MCP SDK's dynamic registration APIs (`server.registerTool()`, `RegisteredTool.remove()`)

**Rationale**:
- SDK already supports dynamic tool registration/unregistration
- `tool list changed` notifications are automatically sent by SDK when tools are added/removed
- No need for custom notification logic

**Reference**: @modelcontextprotocol/sdk@^1.6.1 documentation on dynamic tool management

---

## Best Practices Applied

### 1. Immutable Tool Names

**Practice**: Tool names should not change after registration

**Application**: Using `{toolbox}__{server}_{tool}` format from the start ensures stable names regardless of how many toolboxes are open or closed

**Source**: General software engineering principle - stable identifiers prevent caching/routing errors

---

### 2. Fail-Fast Validation

**Practice**: Validate tool name format during registration, not during invocation

**Application**: When registering tools, validate that toolbox names don't contain `__` and that parsed components are non-empty

**Source**: Constitution Principle IV - "Configuration as Contract"

---

### 3. Explicit Error Context

**Practice**: Include full context in error messages for complex systems

**Application**: Format errors as `[toolbox/server/tool] error message` to distinguish between duplicate instances

**Source**: Constitution Principle V - "Fail-Safe Error Handling"

---

### 4. Locality of Behavior

**Practice**: Keep related state and logic together

**Application**: Maintain `registeredTools` and `connections` within `OpenedToolbox` structure, not in global maps

**Source**: Clean Code principles - high cohesion, low coupling

---

## Open Questions Resolved

All unknowns from Technical Context have been resolved:
- ✅ Tool naming delimiter pattern: Double underscore `__`
- ✅ Backward compatibility strategy: Always use full `{toolbox}__{server}_{tool}` format
- ✅ State management approach: Use existing `OpenedToolbox` structure
- ✅ Delegation routing: Parse tool name, use `original_name` metadata
- ✅ Error isolation: Maintain separate connections per toolbox

## Next Steps

Proceed to Phase 1:
1. Generate data-model.md (minimal - just type updates)
2. Generate quickstart.md (usage examples with duplicate toolboxes)
3. Update agent context with new naming convention
