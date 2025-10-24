<!--
Sync Impact Report:
Version: 1.0.0 (Initial constitution with mandatory documentation update requirements)
Modified Principles: N/A (initial version)
Added Sections:
  - Core Principles (5 principles)
  - Quality Standards (TypeScript, Documentation, Mandatory Updates, Testing)
  - Development Workflow
  - Governance
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligned
  ✅ spec-template.md - Requirements structure compatible
  ✅ tasks-template.md - Task organization matches principles
  ⚠ README.md - Should be reviewed for consistency with documentation mandate
  ⚠ CLAUDE.md - Should be reviewed for consistency with documentation mandate
Follow-up TODOs:
  - Monitor for future changes to MCP SDK that might require protocol updates
  - Review tool naming convention if conflicts emerge in practice
  - Validate that README.md and CLAUDE.md are kept in sync per new mandate
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

All downstream tools MUST be prefixed with their source server name using the pattern `{server}_{tool}` to prevent naming conflicts:

- Server-prefixed naming is MANDATORY in both dynamic and proxy modes
- Tool names MUST be deterministic and predictable
- Original tool names MUST be preserved in metadata for delegation
- Tool descriptions MUST be prefixed with `[server]` to indicate origin

**Rationale**: Consistent prefixing prevents tool name collisions across multiple MCP servers while maintaining clarity about tool provenance and enabling reliable delegation.

### III. Mode-Agnostic Tool Invocation

The workbench MUST support two invocation modes with identical tool naming but different registration strategies:

- **Dynamic Mode (default)**: Tools dynamically registered on the workbench server with prefixed names; MCP clients call tools directly; `tool list changed` notifications sent on toolbox open/close
- **Proxy Mode**: Tools returned with full schemas but not registered; MCP clients invoke via `workbench_use_tool` meta-tool; designed for clients without dynamic registration support

Both modes MUST:
- Use identical `{server}_{tool}` naming convention
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

**Version**: 1.0.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-24
