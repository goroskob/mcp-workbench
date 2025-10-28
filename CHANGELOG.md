# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2025-10-28

### BREAKING CHANGES

**Structured tool naming** - Tool identification has been completely reworked to use structured objects instead of concatenated strings.

**`use_tool` parameter format changed**:
- **Old**: `{ toolbox_name: string, tool_name: string, arguments?: object }`
- **New**: `{ tool: { toolbox: string, server: string, tool: string }, arguments?: object }`

**`open_toolbox` response format changed**:
- Tools now have separate `toolbox_name`, `source_server`, and `name` fields
- The `name` field now contains the original tool name (e.g., `"read_file"`) instead of concatenated format (e.g., `"dev__filesystem__read_file"`)

### Changed

- **BREAKING**: `use_tool` meta-tool now accepts structured tool identifier with three required fields:
  - `tool.toolbox`: Toolbox name containing the tool
  - `tool.server`: MCP server name providing the tool
  - `tool.tool`: Original tool name from downstream server
- **BREAKING**: `open_toolbox` response now returns tools with separate structured metadata fields
  - `toolbox_name`: Name of the toolbox
  - `source_server`: Name of the MCP server
  - `name`: Original tool name (not concatenated)
- Internal: Removed `parseToolName()` and `generateToolName()` methods (string parsing no longer needed)
- Internal: Updated `ToolInfo` interface to use separate fields instead of concatenated names
- Internal: Removed `registeredTools` map from `OpenedToolbox` (lookup now uses structured identifiers)
- Error messages now reference toolbox, server, and tool names as separate components
- Tool routing logic simplified - no string parsing, direct structured lookups

### Migration Guide

**For MCP Client Users:**

1. **Update `use_tool` calls to use structured format:**
   ```diff
   - {
   -   "toolbox_name": "dev",
   -   "tool_name": "dev__filesystem__read_file",
   -   "arguments": { "path": "/file" }
   - }
   + {
   +   "tool": {
   +     "toolbox": "dev",
   +     "server": "filesystem",
   +     "tool": "read_file"
   +   },
   +   "arguments": { "path": "/file" }
   + }
   ```

2. **Update code that parses `open_toolbox` response:**
   ```diff
   - const toolName = tool.name; // "dev__filesystem__read_file"
   - const parts = toolName.split('__');
   + const toolIdentifier = {
   +   toolbox: tool.toolbox_name,  // "dev"
   +   server: tool.source_server,  // "filesystem"
   +   tool: tool.name              // "read_file"
   + };
   ```

3. **Remove any string concatenation/parsing logic** - Tool identifiers are now structured objects

**No backward compatibility** - This is a clean break from string-based naming. All clients must upgrade to structured format.

**Configuration changes**: None - workbench-config.json format is unchanged

## [0.10.0] - 2025-10-28

### BREAKING CHANGES

**Dynamic mode has been removed** - The workbench now operates exclusively in proxy mode. All tool invocation must flow through the `use_tool` meta-tool.

**Meta-tools renamed** - The `workbench_` prefix has been dropped from all meta-tools for cleaner API naming:
- `workbench_open_toolbox` → `open_toolbox`
- `workbench_use_tool` → `use_tool`

### Removed

- **BREAKING**: Removed dynamic mode support
  - Tools are no longer dynamically registered on the workbench server
  - `tool list changed` notifications no longer sent
  - All tool invocation now requires explicit `use_tool` calls
- **BREAKING**: Removed `toolMode` configuration field (proxy mode is now implicit)
  - Configurations with `"toolMode": "dynamic"` will fail with clear error message
  - Configurations with `"toolMode": "proxy"` still work but will show deprecation warning
- Internal: Removed `registerToolsOnServer()` and `unregisterToolsFromServer()` methods
- Internal: Removed `registeredTools` field from `OpenedToolbox` type
- Internal: Removed `RegisteredToolInfo` type

### Changed

- **BREAKING**: Meta-tool names simplified (dropped `workbench_` prefix)
  - `workbench_open_toolbox` → `open_toolbox`
  - `workbench_use_tool` → `use_tool`
- **BREAKING**: Tool invocation now requires `use_tool` for all operations
- `open_toolbox` now always returns full tool list with schemas (previously mode-dependent)
- Configuration validation now explicitly rejects `toolMode: "dynamic"` with migration guidance
- Initialization instructions updated to mention both `open_toolbox` and `use_tool`
- Code simplified: ~300 LOC removed, ~50 LOC updated

### Migration Guide

**For MCP Client Users:**

1. **Update tool names in all tool calls:**
   ```diff
   - Call workbench_open_toolbox with toolbox name
   + Call open_toolbox with toolbox name

   - Call workbench_use_tool with toolbox, tool name, and arguments
   + Call use_tool with toolbox, tool name, and arguments
   ```

2. **Update configuration files:**
   ```diff
   {
   -  "toolMode": "dynamic",
      "toolboxes": { ... }
   }
   ```
   Remove the `toolMode` field entirely or change to `"proxy"` (field is now deprecated but harmless).

3. **Update tool invocation patterns (if using dynamic mode):**

   **Before (dynamic mode):**
   ```typescript
   // Tools were called directly
   await client.callTool({ name: "dev__filesystem__read_file", arguments: { path: "test.txt" } })
   ```

   **After (proxy-only mode):**
   ```typescript
   // All tools invoked via use_tool
   await client.callTool({
     name: "use_tool",
     arguments: {
       toolbox_name: "dev",
       tool_name: "dev__filesystem__read_file",
       arguments: { path: "test.txt" }
     }
   })
   ```

4. **Update response parsing for `open_toolbox`:**

   The response now always includes full tool list (previously this was mode-dependent):
   ```typescript
   {
     toolbox: "dev",
     description: "Development toolbox",
     servers_connected: 2,
     tools: [  // Full array with schemas (not just a count)
       {
         name: "dev__filesystem__read_file",
         source_server: "filesystem",
         description: "...",
         inputSchema: { ... }
       }
     ]
   }
   ```

**For Developers:**

- Type changes: `WorkbenchConfig` no longer has `toolMode` field
- Type changes: `OpenedToolbox` no longer has `registeredTools` field
- Type changes: `OpenToolboxResult` always returns `tools: ToolInfo[]` array
- Architecture: Proxy-only operation, no dynamic registration code paths

### Benefits

- **Simplified architecture**: Single invocation mode eliminates conditional code paths
- **Reduced complexity**: ~300 lines of code removed (dynamic registration logic)
- **Clearer separation**: Meta-tools vs. downstream tools distinction is unambiguous
- **Consistent behavior**: No mode-specific edge cases or behavior differences
- **Easier testing**: Single code path to test and validate

### References

- Migration guide: [specs/006-remove-dynamic-mode/quickstart.md](specs/006-remove-dynamic-mode/quickstart.md)
- Feature specification: [specs/006-remove-dynamic-mode/spec.md](specs/006-remove-dynamic-mode/spec.md)

## [0.9.0] - 2025-10-28

### Removed
- **BREAKING**: Removed `workbench_list_toolboxes` meta-tool from the API
  - Toolbox discovery now provided via `instructions` field in MCP initialization response
  - Follows standard MCP initialization pattern
  - Eliminates extra round-trip for toolbox discovery

### Added
- Initialization `instructions` field containing toolbox listings with names, server counts, and descriptions
- Plain text formatted toolbox discovery available immediately on connection
- Toolbox metadata displayed during MCP handshake without additional tool calls

### Changed
- Meta-tool count reduced: 1 meta-tool in dynamic mode (was 2), 2 in proxy mode (was 3)
- Tool references in descriptions updated to use "initialization instructions" instead of `workbench_list_toolboxes`

### Benefits
- Faster client onboarding (one less round-trip)
- Standard MCP initialization pattern
- Simpler client implementation
- Toolbox discovery integrated into connection handshake

## [0.8.0] - 2025-10-28

### Removed
- **BREAKING**: Removed `workbench_close_toolbox` meta-tool from the API
  - Toolboxes now remain open until server shutdown
  - Automatic cleanup of all connections when server receives SIGINT/SIGTERM
  - This simplifies the API surface and workflow

### Changed
- Toolbox open operations are now idempotent (calling open on an already-open toolbox returns immediately)
- Signal handlers (SIGINT/SIGTERM) now automatically close all open toolboxes before shutdown
- Meta-tool count reduced: 2 meta-tools in dynamic mode (was 3), 3 in proxy mode (was 4)

### Migration Guide

**For MCP Client Users:**

If you are using `workbench_close_toolbox` in your workflows:

**Before (v0.7.x):**
```javascript
// Open toolbox
await client.callTool({ name: "workbench_open_toolbox", arguments: { toolbox_name: "dev" } });

// Use tools...
await client.callTool({ name: "dev__filesystem__read_file", arguments: { path: "..." } });

// Close toolbox when done
await client.callTool({ name: "workbench_close_toolbox", arguments: { toolbox_name: "dev" } });
```

**After (v0.8.0+):**
```javascript
// Open toolbox
await client.callTool({ name: "workbench_open_toolbox", arguments: { toolbox_name: "dev" } });

// Use tools...
await client.callTool({ name: "dev__filesystem__read_file", arguments: { path: "..." } });

// No manual close needed - toolboxes remain open until server shutdown
// Automatic cleanup happens when server receives SIGINT/SIGTERM
```

**Action Required:**
- **Remove all calls to `workbench_close_toolbox`** from your code
- Toolboxes will remain open until the MCP Workbench server shuts down
- All connections are automatically cleaned up on server shutdown (within 5 seconds)

## [0.7.3] - 2025-10-27

### Fixed
- Reverted to parallel server connections for faster startup (from sequential in 0.7.2)
- Resolved race conditions without sacrificing startup performance

## [0.7.2] - 2025-10-27

### Fixed
- Changed parallel to sequential server connections to avoid race conditions

## [0.7.1] - 2025-10-27

### Added
- Support for multiple toolboxes with duplicate MCP server instances
  - Multiple toolboxes can now have servers with the same name
  - Each toolbox maintains independent server connections
  - Tools are uniquely addressable across all toolboxes

### Changed
- **BREAKING**: Tool naming format changed from `{server}_{tool}` to `{toolbox}__{server}_{tool}`
  - Double underscore `__` separates toolbox from server+tool
  - Single underscore `_` separates server from tool (unchanged)
  - Example: `filesystem_read_file` → `main__filesystem_read_file`
  - All MCP clients must update tool invocation names
  - Configuration files remain unchanged (no user action required)
- Tool descriptions now show toolbox context: `[toolbox/server] description` (previously `[server] description`)
- Tool handlers now perform dynamic lookup of toolbox and server at invocation time
- Added validation for missing toolbox or server during tool invocation

### Migration Guide

**For MCP Client Users:**

If you are using MCP Workbench v0.3.x or earlier, tool names will change when upgrading:

**Before (v0.3.x):**
```
filesystem_read_file
clickhouse_run_query
```

**After (v0.4.0+):**
```
main__filesystem_read_file
incident-analysis__clickhouse_run_query
```

The toolbox name prefix depends on your `workbench-config.json` configuration. If your configuration defines toolboxes named `dev`, `prod`, etc., tool names will be prefixed with those names.

**For Configuration Owners:**

No changes required to `workbench-config.json`. The file format remains the same.

**For Developers:**

If extending MCP Workbench:
- Use `ClientManager.generateToolName(toolbox, server, tool)` for creating tool names
- Use `ClientManager.parseToolName(registeredName)` for extracting components
- Tool handlers now dynamically look up toolbox and server connections

---

## [0.6.0] - 2025-10-27

### Added

- **Constitution Principle VI: Release Policy and Workflow** - New governance principle enforcing merge-first, tag-second workflow
  - All releases MUST be created from `main` branch after PR merge
  - Tags MUST NOT be created from feature branches before merging
  - Includes release validation checklist for maintainers
- **Automated Release Policy Enforcement** in GitHub Actions workflow
  - Release workflow now verifies tag was created from `main` branch
  - Fails with helpful error message if policy violated
  - Uses git merge-base ancestry check for verification

### Changed

- Constitution updated from v1.2.0 to v1.3.0
- Enhanced `.github/workflows/release.yml` with branch ancestry validation
- Improved release process documentation

### Rationale

This release codifies lessons learned from v0.5.0 where the release tag was pushed from a feature branch before merging, creating temporary divergence between the published release and the main branch. The new policy and automated enforcement prevent this scenario and ensure all releases correspond to code that has been reviewed and merged to main.

---

## [0.5.0] - 2025-10-27

### Breaking Changes

- **Tool Naming Format**: Changed from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}` for consistent double-underscore separators between all components
  - **Migration required**: All tool invocations must be updated to use the new format
  - **Incompatible change released as minor version**: This is an incompatible change released as v0.5.0 (minor bump) per maintainer decision, deviating from strict semantic versioning
  - Old format: `main__filesystem_read_file` (mixed separators)
  - New format: `main__filesystem__read_file` (consistent double underscores)
  - Old format will be rejected with error message directing to documentation

### Changed

- Simplified `ClientManager.parseToolName()` to use consistent separator parsing with `split('__', 3)`
- Updated all error messages to reference new tool name format with helpful hints
- Updated all documentation with new naming convention examples

### Added

- Migration guide in README.md with before/after examples and checklist
- Improved error messages with format hints: "Expected format: {toolbox}__{server}__{tool} (note: double underscores between all components)"

### Migration Guide: v0.4.0 → v0.5.0

**What Changed:**
The separator between server name and tool name changed from single underscore (`_`) to double underscore (`__`).

**Examples:**
| Component | Old Format (v0.4.0) | New Format (v0.5.0) |
|-----------|---------------------|---------------------|
| Filesystem read | `dev__filesystem_read_file` | `dev__filesystem__read_file` |
| Memory store | `prod__memory_store_value` | `prod__memory__store_value` |

**Migration Checklist:**
- [ ] Update all tool invocations to use double underscore before tool name
- [ ] Update any custom tool name parsing logic in your client code
- [ ] Test all tool calls with new format
- [ ] Update client-side documentation/examples

**Troubleshooting:**
- **Error**: "Tool 'dev__filesystem_read_file' not found"
- **Solution**: Update to new format `dev__filesystem__read_file` (double underscore before tool name)

---

## [0.3.3] - 2025-01-XX

### Changed
- Parallelized server connections in `workbench_open_toolbox` for better performance
- Documented proxy mode and tool invocation modes

### Added
- Comprehensive documentation of proxy mode vs dynamic mode

---

## [0.3.0] - 2025-01-XX

### Added
- Proxy mode support (`toolMode: "proxy"`) for MCP clients without dynamic registration
- `workbench_use_tool` meta-tool for proxy mode invocation

---

## [0.2.0] - 2025-01-XX

### Added
- Initial release with dynamic tool registration
- Three core meta-tools: `workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`
- Standard MCP server configuration schema compatibility
- Tool filtering support

---

[Unreleased]: https://github.com/hlibkoval/mcp-workbench/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/hlibkoval/mcp-workbench/compare/v0.3.0...v0.3.3
[0.3.0]: https://github.com/hlibkoval/mcp-workbench/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/hlibkoval/mcp-workbench/releases/tag/v0.2.0
