# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
