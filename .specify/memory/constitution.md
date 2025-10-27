<!--
Sync Impact Report:
Version: 1.2.0 (Updated tool naming convention to use consistent double underscores)
Modified Principles:
  - Principle II (Tool Naming and Conflict Resolution) - Updated from {toolbox}__{server}_{tool} to {toolbox}__{server}__{tool}
  - Principle III (Mode-Agnostic Tool Invocation) - Updated naming reference to {toolbox}__{server}__{tool}
Added Sections: N/A
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - No changes needed (naming convention not hardcoded)
  ✅ spec-template.md - No changes needed (naming convention not hardcoded)
  ✅ tasks-template.md - No changes needed (naming convention not hardcoded)
  ✅ README.md - Updated with new naming convention, migration guide, examples
  ✅ CLAUDE.md - Updated with new naming convention, architecture details
  ✅ CHANGELOG.md - Updated with v0.5.0 incompatible change documentation
Follow-up TODOs:
  - Monitor for future changes to MCP SDK that might require protocol updates
Previous Versions:
  - 1.1.0 (2025-10-27): Updated tool naming to support duplicate servers across toolboxes
  - 1.0.0 (2025-10-24): Initial constitution
-->

# MCP Workbench Constitution

## Core Principles

### I. Meta-Server Orchestration Pattern

The MCP Workbench is a meta-MCP server that MUST act as both an MCP server (exposing meta-tools) and an MCP client (connecting to downstream servers). This dual nature is non-negotiable:

- MUST expose exactly 3 meta-tools in dynamic mode: `workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`
- MUST expose exactly 4 meta-tools in proxy mode: the above three plus `workbench_use_tool`
- MUST NOT create downstream connections at startup (lazy connection management)
- MUST support multiple simultaneously open toolboxes
- MUST properly clean up connections when toolboxes close

**Rationale**: The meta-server pattern enables efficient resource management and domain-organized tool discovery without coupling the workbench to specific downstream implementations.

### II. Tool Naming and Conflict Resolution

All downstream tools MUST be prefixed with both their toolbox and source server name using the pattern `{toolbox}__{server}__{tool}` (consistent double underscores) to prevent naming conflicts:

- Toolbox and server-prefixed naming is MANDATORY in both dynamic and proxy modes
- Double underscore `__` MUST separate all components (toolbox, server, tool)
- Tool names MUST be deterministic and predictable
- Original tool names MUST be preserved in metadata for delegation
- Tool descriptions MUST be prefixed with `[toolbox/server]` to indicate origin

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem__read_file`
- Toolbox "prod", server "filesystem", tool "read_file" → `prod__filesystem__read_file`

**Rationale**: Three-level naming (toolbox + server + tool) with consistent double-underscore separators prevents conflicts between duplicate MCP server instances across multiple toolboxes while maintaining clarity about tool provenance and simplifying parsing logic. This enables multiple toolboxes to use the same MCP server without naming collisions, supporting development/production isolation and multi-environment workflows.

### III. Mode-Agnostic Tool Invocation

The workbench MUST support two invocation modes with identical tool naming but different registration strategies:

- **Dynamic Mode (default)**: Tools dynamically registered on the workbench server with prefixed names; MCP clients call tools directly; `tool list changed` notifications sent on toolbox open/close
- **Proxy Mode**: Tools returned with full schemas but not registered; MCP clients invoke via `workbench_use_tool` meta-tool; designed for clients without dynamic registration support

Both modes MUST:
- Use identical `{toolbox}__{server}__{tool}` naming convention
- Delegate to downstream servers using original tool names
- Return identical results for equivalent operations
- Apply identical tool filters from configuration

**Rationale**: Supporting both modes maximizes compatibility across MCP client implementations while maintaining consistent behavior and naming.

### IV. Configuration as Contract

The workbench configuration file is the authoritative source of truth and MUST be validated at startup:

- Configuration file path MUST be provided via `WORKBENCH_CONFIG` environment variable
- Configuration MUST use standard MCP server schema for `mcpServers` entries (compatible with Claude Desktop/.claude.json)
- Workbench-specific extensions (`toolFilters`, `transport`, `toolMode`) MUST be clearly documented
- Invalid configurations MUST fail fast with clear error messages
- Configuration errors MUST prevent server startup

**Rationale**: Early validation prevents runtime failures and ensures configuration compatibility with existing MCP tooling.

### V. Fail-Safe Error Handling

Errors at different stages MUST be handled with appropriate strategies:

- **Configuration errors**: Fail fast at startup, log detailed validation errors, exit with non-zero status
- **Connection errors**: Clean up partial connections, include server name and toolbox context in error messages
- **Tool execution errors**: Set `isError: true`, wrap error with toolbox/server/tool context, preserve downstream error details
- **Protocol errors**: Log with full context, attempt graceful degradation where possible

All errors MUST include sufficient context for debugging: toolbox name, server name, tool name (where applicable).

**Rationale**: Context-rich error handling enables rapid troubleshooting in complex multi-server scenarios while preventing cascading failures.

## Quality Standards

### TypeScript Type Safety

- Strict mode MUST be enabled in tsconfig.json
- All types MUST be explicitly defined in src/types.ts
- Tool handler parameters MUST be typed with proper input schemas
- Type assertions MUST be used judiciously with clear justification

### Documentation Standards

- README.md MUST contain installation, configuration, and usage examples
- CLAUDE.md MUST contain architecture overview and development guidance
- Tool descriptions MUST be clear, concise, and include example usage
- Configuration schema MUST be documented with all fields explained

### Mandatory Documentation Updates

The following changes MUST trigger corresponding documentation updates before merge:

**README.md update triggers:**
- New meta-tools added or removed
- Configuration schema changes (new fields, changed defaults, deprecated options)
- New installation methods or requirements
- Changes to usage examples or workflows
- New toolbox concepts or invocation patterns
- Breaking changes affecting end users

**CLAUDE.md update triggers:**
- Core architecture changes (meta-server pattern, connection management)
- Changes to tool registration or delegation logic
- New or modified design patterns
- Code organization changes (new files, moved responsibilities)
- Build or release workflow changes
- Type system changes affecting development

**Both documents MUST be updated when:**
- Core principles are added, removed, or redefined
- Tool naming convention changes
- Invocation mode behavior changes
- Error handling strategies change

**Rationale**: Documentation drift causes confusion and maintenance burden. Mandating synchronous updates ensures README.md serves end users accurately while CLAUDE.md guides contributors effectively. Both documents are primary entry points for their respective audiences and MUST reflect current implementation.

### Testing Philosophy

- Test with real downstream MCP servers (e.g., @modelcontextprotocol/server-memory)
- Use workbench-config.test.json for isolated testing
- Manual testing workflow MUST be documented
- Breaking changes MUST be validated against example configurations

## Development Workflow

### Build and Release

- TypeScript MUST be compiled before running (`npm run build`)
- Development mode (`npm run dev`) uses tsx watch for hot-reload
- Version updates MUST follow semantic versioning (MAJOR.MINOR.PATCH)
- Releases MUST be triggered by pushing version tags (v*)
- Automated CI/CD via GitHub Actions MUST build, test, and publish to npm

### Version Bump Guidelines

- **MAJOR**: Breaking changes to meta-tool schemas, configuration format, or tool naming convention
- **MINOR**: New features (e.g., new transport types), new configuration options, backward-compatible enhancements
- **PATCH**: Bug fixes, documentation updates, internal refactoring, dependency updates

### Code Organization

- Main server logic in src/index.ts (meta-tools, lifecycle management)
- Client connection management in src/client-manager.ts (connection pooling, tool registration/delegation)
- Configuration validation in src/config-loader.ts (validation, schema checks)
- Type definitions in src/types.ts (all shared types and interfaces)

### Commit and Branch Standards

- Feature branches MUST follow pattern: `feature/descriptive-name`
- Bug fix branches MUST follow pattern: `fix/issue-description`
- Commit messages MUST follow conventional commits format
- Breaking changes MUST be clearly documented in commit messages and CHANGELOG

## Governance

### Amendment Process

1. Proposed changes to this constitution MUST be documented in a GitHub issue
2. Changes affecting core principles REQUIRE discussion and consensus
3. Version number MUST be updated following semantic versioning rules for constitutions:
   - **MAJOR**: Backward incompatible principle removals or redefinitions
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording improvements, non-semantic refinements
4. Sync Impact Report MUST be updated to reflect all changes
5. Dependent templates (plan, spec, tasks) MUST be updated for consistency

### Compliance Requirements

- All PRs MUST verify adherence to core principles
- All PRs MUST include documentation updates if any mandatory triggers apply
- Code reviews MUST check for principle violations and documentation completeness
- Complexity that violates principles MUST be explicitly justified
- Use CLAUDE.md for runtime development guidance and architecture decisions

### Template Synchronization

When constitution is updated:
1. Review plan-template.md Constitution Check section
2. Review spec-template.md for requirement alignment
3. Review tasks-template.md for task categorization consistency
4. Update any command files referencing outdated principle names
5. Update CLAUDE.md if architectural principles change
6. Update README.md if user-facing guidance changes

**Version**: 1.2.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-27
