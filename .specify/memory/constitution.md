<!--
Sync Impact Report:
Version: 1.6.0 (Remove dynamic mode, rename meta-tools)
Modified Principles:
  - I. Meta-Server Orchestration Pattern - Removed dynamic mode, updated meta-tools to `open_toolbox` and `use_tool` (dropped `workbench_` prefix), simplified to proxy-only operation
  - II. Tool Naming and Conflict Resolution - Removed mode-specific language
  - III. Proxy-Based Tool Invocation - Renamed from "Mode-Agnostic Tool Invocation", removed dynamic mode entirely, simplified to proxy-only description
Added Sections: N/A
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - No changes needed (mode removal is implementation-specific)
  ✅ spec-template.md - No changes needed (feature-specific changes)
  ✅ tasks-template.md - No changes needed (task structure unchanged)
  ⏳ README.md - Needs update (remove dynamic mode references, update tool names)
  ⏳ CLAUDE.md - Needs update (remove dynamic mode architecture, update tool names)
  ⏳ CHANGELOG.md - Needs update for v0.10.0 release with breaking changes
Follow-up TODOs:
  - Update README.md to remove all dynamic mode references and rename tools
  - Update CLAUDE.md architecture documentation for proxy-only mode
  - Update CHANGELOG.md with breaking change notice for v0.10.0
  - Verify tool renaming works correctly with MCP clients
Previous Versions:
  - 1.5.0 (2025-10-27): Initialization instructions for toolbox discovery
  - 1.4.0 (2025-10-27): Simplified toolbox lifecycle - removed manual close operations
  - 1.3.0 (2025-10-27): Added release policy principle and enhanced development workflow
  - 1.2.0 (2025-10-27): Updated tool naming convention to use consistent double underscores
  - 1.1.0 (2025-10-27): Updated tool naming to support duplicate servers across toolboxes
  - 1.0.0 (2025-10-24): Initial constitution
-->

# MCP Workbench Constitution

## Core Principles

### I. Meta-Server Orchestration Pattern

The MCP Workbench is a meta-MCP server that MUST act as both an MCP server (exposing meta-tools) and an MCP client (connecting to downstream servers). This dual nature is non-negotiable:

- MUST provide toolbox discovery via initialization `instructions` field (MCP standard pattern)
- MUST expose exactly 2 meta-tools: `open_toolbox` and `use_tool`
- MUST NOT create downstream connections at startup (lazy connection management)
- MUST support multiple simultaneously open toolboxes
- MUST support idempotent open operations (calling open on already-open toolbox returns immediately)
- MUST properly clean up all connections when server shuts down (SIGINT/SIGTERM)

**Rationale**: The meta-server pattern enables efficient resource management and domain-organized tool discovery without coupling the workbench to specific downstream implementations. Toolbox discovery via initialization instructions follows standard MCP patterns and eliminates extra round-trips. Automatic cleanup on shutdown simplifies the API and prevents resource leaks while reducing cognitive burden on users. Proxy-only operation simplifies the architecture and eliminates mode-specific code paths.

### II. Tool Naming and Conflict Resolution

All downstream tools MUST be prefixed with both their toolbox and source server name using the pattern `{toolbox}__{server}__{tool}` (consistent double underscores) to prevent naming conflicts:

- Toolbox and server-prefixed naming is MANDATORY
- Double underscore `__` MUST separate all components (toolbox, server, tool)
- Tool names MUST be deterministic and predictable
- Original tool names MUST be preserved in metadata for delegation
- Tool descriptions MUST be prefixed with `[toolbox/server]` to indicate origin

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem__read_file`
- Toolbox "prod", server "filesystem", tool "read_file" → `prod__filesystem__read_file`

**Rationale**: Three-level naming (toolbox + server + tool) with consistent double-underscore separators prevents conflicts between duplicate MCP server instances across multiple toolboxes while maintaining clarity about tool provenance and simplifying parsing logic. This enables multiple toolboxes to use the same MCP server without naming collisions, supporting development/production isolation and multi-environment workflows.

### III. Proxy-Based Tool Invocation

The workbench operates exclusively in proxy mode, where all tool invocation flows through the `use_tool` meta-tool:

- Tools MUST be returned with full schemas via `open_toolbox` but NOT dynamically registered
- Tool invocation MUST occur via the `use_tool` meta-tool with explicit toolbox and tool names
- Tool names MUST follow the `{toolbox}__{server}__{tool}` naming convention
- All tool calls MUST delegate to downstream servers using original tool names
- Tool filters from configuration MUST be applied during toolbox opening

**Rationale**: Proxy-only operation simplifies the architecture, eliminates mode-specific code paths, and provides a consistent invocation pattern across all MCP clients. This design trades dynamic tool registration convenience for reduced complexity and clearer separation between meta-tools and downstream tools.

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

### VI. Release Policy and Workflow

All releases MUST follow a merge-first, tag-second workflow to ensure the main branch remains the single source of truth:

**Mandatory Release Workflow:**
1. **Feature Development**: Create feature branch from `main`
2. **Pull Request**: Open PR against `main` with complete documentation updates
3. **Code Review**: Ensure all core principles are satisfied and documentation is synchronized
4. **Merge First**: Merge PR to `main` branch (squash or merge commit as appropriate)
5. **Tag from Main**: Create version tag ONLY after merge, always from `main` branch
6. **Push Tag**: Push tag to trigger automated release workflow

**Prohibited Practices:**
- MUST NOT tag from feature branches before merging
- MUST NOT create releases that don't correspond to the tip of `main`
- MUST NOT bypass PR review process for releases

**Release Tag Format:**
- MUST use semantic versioning: `v{MAJOR}.{MINOR}.{PATCH}`
- MUST be annotated tags with release description
- MUST be pushed to remote to trigger CI/CD release workflow

**Automated Release Process:**
When a version tag matching `v*` is pushed from `main`:
1. GitHub Actions MUST build and test the code
2. GitHub Actions MUST create a GitHub release with auto-generated notes
3. GitHub Actions MUST publish to npm registry
4. GitHub Actions MUST upload distribution artifacts

**Version Bump Guidelines:**
- **MAJOR**: Breaking changes to meta-tool schemas, configuration format, or tool naming convention
- **MINOR**: New features, new configuration options, backward-compatible enhancements
- **PATCH**: Bug fixes, documentation updates, internal refactoring, dependency updates

**Release Validation Checklist:**
Before pushing a release tag, verify:
- [ ] All changes are merged to `main`
- [ ] Version in `package.json` matches tag version
- [ ] `CHANGELOG.md` contains entry for this version
- [ ] Breaking changes are documented with migration guides
- [ ] All documentation (README.md, CLAUDE.md) is up to date
- [ ] CI/CD tests pass on `main` branch
- [ ] Tag is created from latest `main` commit

**Rationale**: The merge-first policy prevents divergence between published releases and the main branch, ensures all releases undergo code review, maintains clean git history, and prevents confusion about which code was actually released. This discipline is essential for maintaining trust in the published packages and enabling reliable rollbacks if needed.

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

### Build and Development

- TypeScript MUST be compiled before running (`npm run build`)
- Development mode (`npm run dev`) uses tsx watch for hot-reload
- Clean builds SHOULD use `npm run clean && npm run build`
- Distribution artifacts are output to `dist/` directory

### Code Organization

- Main server logic in src/index.ts (meta-tools, lifecycle management)
- Client connection management in src/client-manager.ts (connection pooling, tool registration/delegation)
- Configuration validation in src/config-loader.ts (validation, schema checks)
- Type definitions in src/types.ts (all shared types and interfaces)

### Commit and Branch Standards

- Feature branches MUST follow pattern: `NNN-brief-description` where NNN is the spec number (e.g., `001-duplicate-tools-support`)
- Bug fix branches MUST follow pattern: `fix/issue-description`
- Commit messages MUST follow conventional commits format (`feat:`, `fix:`, `docs:`, etc.)
- Breaking changes MUST use `feat!:` or `fix!:` and include `BREAKING CHANGE:` in commit body
- Breaking changes MUST be clearly documented in commit messages and CHANGELOG.md

## Governance

### Amendment Process

1. Proposed changes to this constitution MUST be documented in a GitHub issue or discussion
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

**Version**: 1.4.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-28
