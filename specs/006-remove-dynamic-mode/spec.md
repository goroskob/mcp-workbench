# Feature Specification: Remove Dynamic Mode Support

**Feature Branch**: `006-remove-dynamic-mode`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "drop support for "dynamic" mode and mode selection altogether. it will be reintroduced once Claude Code supports dynamic mcp tools loading. this will be a minor version bump - we're still incubating"

## Clarifications

### Session 2025-10-28

- Q: How many meta-tools should the workbench expose after removing both dynamic mode AND `workbench_list_toolboxes`? → A: 2 meta-tools: `open_toolbox` and `use_tool` (dropping `workbench_` prefix, toolbox discovery via initialization instructions)
- Q: Should the initialization instructions field mention the renamed tools (e.g., "use `open_toolbox` to connect") or use generic guidance? → A: Explicitly mention tool names: "Use `open_toolbox` to connect to a toolbox, then `use_tool` to invoke tools"
- Q: When should references to the old `workbench_` prefixed tool names be updated in the codebase - as part of this feature or as a separate follow-up? → A: Update all tool names in this feature (complete renaming in version 0.10.0)
- Q: What version number should this feature target given current version is 0.9.0? → A: 0.10.0 (minor version bump)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proxy-Based Tool Invocation (Priority: P1)

As an MCP client user, I need to invoke downstream tools using the `use_tool` meta-tool with explicit toolbox, tool name, and arguments, so that I can access MCP server capabilities through a stable proxy interface.

**Why this priority**: This is the fundamental mechanism for tool invocation after removing dynamic mode. Without this working, the entire workbench is non-functional.

**Independent Test**: Can be fully tested by opening a toolbox and calling `use_tool` with valid parameters, delivering successful tool execution.

**Acceptance Scenarios**:

1. **Given** a toolbox is opened, **When** I call `use_tool` with valid toolbox name, tool name (prefixed format), and arguments, **Then** the tool executes successfully and returns results from the downstream server
2. **Given** multiple toolboxes are open, **When** I call `use_tool` specifying different toolbox names, **Then** each call routes to the correct downstream server in the appropriate toolbox
3. **Given** a server has multiple tools, **When** I call `use_tool` with different tool names from that server, **Then** each call routes correctly to the downstream server

---

### User Story 2 - Toolbox Opening with Tool Discovery (Priority: P1)

As an MCP client user, I need to open a toolbox and receive a complete list of available tools with their schemas, so that I can discover what tools I can invoke via `use_tool`.

**Why this priority**: Critical prerequisite for tool invocation - without tool discovery, users don't know what tools are available.

**Independent Test**: Can be tested by calling `open_toolbox` and verifying the response contains complete tool information.

**Acceptance Scenarios**:

1. **Given** I call `open_toolbox` with a valid toolbox name, **When** the operation completes, **Then** the response includes a complete list of tools with their schemas, descriptions, and server-prefixed names
2. **Given** a toolbox has tool filters configured, **When** I open the toolbox, **Then** only filtered tools appear in the returned tool list
3. **Given** I call `open_toolbox` on an already-open toolbox, **When** the operation completes, **Then** the operation is idempotent (returns cached tool list)

---

### User Story 3 - Configuration Migration (Priority: P2)

As a workbench administrator, I need existing configurations to work without the `toolMode` field, so that upgrades are straightforward and don't break existing deployments.

**Why this priority**: Important for smooth migration but not blocking core functionality. Most users likely use default mode anyway.

**Independent Test**: Can be tested by loading configuration files and verifying they all start the server successfully in proxy-only mode.

**Acceptance Scenarios**:

1. **Given** a configuration file without `toolMode` specified, **When** the server starts, **Then** it operates successfully in proxy mode
2. **Given** a configuration file with `"toolMode": "proxy"`, **When** the server starts, **Then** it operates normally (field is now redundant but ignored)
3. **Given** a configuration file with `"toolMode": "dynamic"`, **When** the server starts, **Then** it fails validation with clear error message indicating dynamic mode is no longer supported

---

### Edge Cases

- What happens when tools are called by prefixed names directly (dynamic mode behavior)?
  - Tools are not registered on workbench server - calls will fail with "tool not found"
  - Only `use_tool` is available for tool invocation
- What happens when a configuration file contains `"toolMode": "dynamic"` (removed mode)?
  - Configuration validation fails with clear error message
  - User must remove the field or change to "proxy" (though proxy is implicit now)
- What happens if downstream server connection fails during toolbox open?
  - Return error immediately - no tools available for that toolbox
  - Partial success (some servers connected) returns tools from successful connections
- What happens to documentation referencing dynamic mode?
  - Must be updated to remove all dynamic mode references
  - Update CLAUDE.md, README.md, and type documentation

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove `toolMode` configuration field from schema (or reject "dynamic" value)
- **FR-002**: System MUST rename meta-tools by dropping `workbench_` prefix (`use_tool` and `open_toolbox`)
- **FR-003**: System MUST remove all dynamic mode conditional logic from codebase
- **FR-004**: System MUST NOT register downstream tools on the workbench server (no dynamic registration)
- **FR-005**: System MUST NOT send tool list changed notifications (no tools are registered dynamically)
- **FR-006**: System MUST continue using prefixed tool naming format `{toolbox}__{server}__{tool}` in tool metadata
- **FR-007**: `use_tool` MUST parse toolbox/server/tool names to route calls to correct downstream servers
- **FR-008**: `open_toolbox` MUST return full tool list with schemas (for tool discovery)
- **FR-009**: System MUST remove dynamic-mode-specific code paths (tool registration, tool handlers, notifications)
- **FR-010**: System MUST ensure no `close_toolbox` references remain (already removed in previous feature)
- **FR-011**: Configuration loader MUST reject `"toolMode": "dynamic"` with clear error message
- **FR-012**: System MUST expose exactly two meta-tools: `open_toolbox` and `use_tool` (toolbox discovery via initialization instructions per feature 005)
- **FR-013**: Initialization instructions MUST explicitly mention renamed tool names: "Use `open_toolbox` to connect to a toolbox, then `use_tool` to invoke tools"

### Key Entities

- **WorkbenchConfig**: Configuration schema - remove `toolMode` field entirely, keep `toolboxes` map
- **OpenedToolbox**: Runtime state - keep `connections` map, remove `registeredTools` map (no longer needed)
- **OpenToolboxResult**: Response type - single structure with full `tools` array (includes schemas)
- **ToolInfo**: Tool metadata - keep `source_server`, `toolbox_name`, `original_name` fields for `use_tool` routing

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All tool invocations complete successfully using `use_tool` meta-tool
- **SC-002**: Toolbox opening returns complete tool list with schemas within 5 seconds
- **SC-003**: Configuration files without `toolMode` field load successfully
- **SC-004**: Configuration files with `"toolMode": "dynamic"` fail validation with clear error message
- **SC-005**: Documentation contains zero references to "dynamic mode" or mode selection
- **SC-006**: Version bump to 0.10.0 reflects removal of dynamic mode feature and tool renaming

## Dependencies & Assumptions *(mandatory)*

### Dependencies

- Requires `@modelcontextprotocol/sdk` for basic MCP server and client functionality
- Requires existing `ClientManager` architecture for downstream server connections
- Depends on `use_tool` proxy mechanism already implemented (will be renamed from `use_tool`)

### Assumptions

- Claude Code does NOT currently support dynamic MCP tool registration
- Single mode of operation (proxy only) simplifies codebase and reduces maintenance burden
- Users can adapt to using `use_tool` for all tool invocations
- Dynamic mode will be reintroduced in a future version when Claude Code adds support
- Pre-1.0.0 status allows breaking changes (minor version bump acceptable)
- Most users are using default mode (dynamic), so this will impact them

## Out of Scope *(optional)*

- Adding new transport types (HTTP/SSE - separate future work)
- Changing tool naming convention (retains `{toolbox}__{server}__{tool}` format)
- Performance optimizations for tool discovery
- Automatic toolbox closing (toolboxes remain open until shutdown per previous feature)
- Migration guide for users (breaking change, but simple - use `use_tool` for all calls and note tool renaming)
- Reintroducing dynamic mode (future work, blocked on Claude Code support)

## Risks & Mitigations *(optional)*

### Risks

1. **Breaking Change Impact**: Users relying on default dynamic mode (most users) will need to update their tool invocation approach
   - **Mitigation**: Clear upgrade guide, version bump to 0.10.0, comprehensive changelog explaining the change

2. **Documentation Drift**: Extensive documentation references dynamic mode as default throughout
   - **Mitigation**: Search codebase for "dynamic", "proxy", "toolMode" - update all occurrences to reflect proxy-only operation

3. **Code Removal Complexity**: Removing tool registration logic across multiple files may introduce bugs
   - **Mitigation**: Comprehensive testing with workbench-config.test.json, verify proxy path works for all scenarios

## Related Features

- **004-remove-manual-close**: Removed `close_toolbox` - ensure no references remain
- **005-init-instructions-toolboxes**: Initialization instructions - update to reflect single mode
- **001-duplicate-tools-support**: Tool naming with prefixes - core functionality retained
- **003-env-var-expansion**: Environment variable expansion - unaffected by mode removal
