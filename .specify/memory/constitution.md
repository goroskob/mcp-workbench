<!--
Sync Impact Report:
Version: 1.8.0 (Incubation stage policy)
Modified Principles:
  - VI. Release Policy and Workflow - Added version bump guidelines section specifying relaxed semver during incubation
Added Sections:
  - VII. Incubation Stage Policy - New principle defining pre-1.0.0 incubation rules
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - No changes needed (implementation-specific)
  ✅ spec-template.md - No changes needed (feature-specific changes)
  ✅ tasks-template.md - No changes needed (task structure unchanged)
  ✅ README.md - Added incubation warning badge and Versioning Policy section
  ✅ CLAUDE.md - Updated release workflow section with detailed incubation policy
Follow-up TODOs: None - all updates completed
Previous Versions:
  - 1.7.0 (2025-10-28): Structured tool naming
  - 1.6.0 (2025-10-28): Remove dynamic mode, rename meta-tools
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

All downstream tools MUST be identified using structured objects with three required fields to prevent naming conflicts:

- Tool identification MUST use structured format: `{ toolbox: string, server: string, tool: string }`
- All three fields (toolbox, server, tool) are MANDATORY and MUST be non-empty strings
- Tool identifiers MUST be deterministic and predictable from separate components
- Original tool names MUST be preserved in metadata for delegation to downstream servers
- Tool metadata MUST include separate `toolbox_name`, `source_server`, and `name` fields

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `{ toolbox: "dev", server: "filesystem", tool: "read_file" }`
- Toolbox "prod", server "filesystem", tool "read_file" → `{ toolbox: "prod", server: "filesystem", tool: "read_file" }`

**Rationale**: Structured three-level naming (toolbox + server + tool) prevents conflicts between duplicate MCP server instances across multiple toolboxes while maintaining clarity about tool provenance and eliminating string parsing ambiguity. This enables multiple toolboxes to use the same MCP server without naming collisions, supporting development/production isolation and multi-environment workflows. The structured format makes tool identification explicit and prevents issues with special characters in tool names.

### III. Proxy-Based Tool Invocation

The workbench operates exclusively in proxy mode, where all tool invocation flows through the `use_tool` meta-tool:

- Tools MUST be returned with full schemas via `open_toolbox` but NOT dynamically registered
- Tool invocation MUST occur via the `use_tool` meta-tool with structured tool identifier: `{ tool: { toolbox, server, tool }, arguments }`
- Tool metadata MUST use separate fields (toolbox_name, source_server, name) not concatenated strings
- All tool calls MUST delegate to downstream servers using original tool names from the structured identifier
- Tool filters from configuration MUST be applied during toolbox opening

**Rationale**: Proxy-only operation with structured identifiers simplifies the architecture, eliminates mode-specific code paths and string parsing logic, and provides a consistent invocation pattern across all MCP clients. This design trades dynamic tool registration convenience for reduced complexity, clearer separation between meta-tools and downstream tools, and elimination of parsing ambiguity.

### IV. Configuration as Contract

The workbench configuration file is the authoritative source of truth and MUST be validated at startup:

- Configuration file path MUST be provided via `WORKBENCH_CONFIG` environment variable
- Configuration MUST use standard MCP server schema for `mcpServers` entries (compatible with Claude Desktop/.claude.json)
- Workbench-specific extensions (`toolFilters`, `transport`) MUST be clearly documented
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

**While in incubation (versions < 1.0.0):**
- Semver is RELAXED: breaking changes are permitted at any time
- No migration guides or backward compatibility considerations required during incubation
- Version increments follow general guidance but are advisory:
  - **MAJOR** (0.x.0 → 0.y.0): Significant architectural changes or major feature sets
  - **MINOR** (0.x.y → 0.x.z): New features, enhancements, or minor breaking changes
  - **PATCH** (0.x.y → 0.x.y+1): Bug fixes, documentation updates, small refinements
- Breaking changes are normal and expected - iterate fast without legacy burden

**After reaching 1.0.0 (graduation from incubation):**
- **MAJOR**: Breaking changes to meta-tool schemas, configuration format, or tool naming convention
- **MINOR**: New features, new configuration options, backward-compatible enhancements
- **PATCH**: Bug fixes, documentation updates, internal refactoring, dependency updates
- Migration guides MUST be provided for breaking changes

**Release Validation Checklist:**
Before pushing a release tag, verify:
- [ ] All changes are merged to `main`
- [ ] Version in `package.json` matches tag version
- [ ] `CHANGELOG.md` contains entry for this version
- [ ] All documentation (README.md, CLAUDE.md) is up to date
- [ ] CI/CD tests pass on `main` branch
- [ ] Tag is created from latest `main` commit

**Rationale**: The merge-first policy prevents divergence between published releases and the main branch, ensures all releases undergo code review, maintains clean git history, and prevents confusion about which code was actually released. This discipline is essential for maintaining trust in the published packages and enabling reliable rollbacks if needed. Relaxed semver during incubation enables rapid iteration without the burden of maintaining backward compatibility before core patterns stabilize.

### VII. Incubation Stage Policy

The project is in an incubation stage for all versions < 1.0.0, enabling rapid iteration and experimentation without backward compatibility constraints:

**Incubation Status Rules:**
- The project MUST remain in incubation until version 1.0.0 is explicitly released
- The project MUST NOT graduate from incubation (reach 1.0.0) without explicit decision and announcement
- Incubation status MUST be clearly communicated in all public documentation (README.md, package.json description)
- Pre-1.0.0 releases MUST be tagged as incubating or experimental in public communications

**During Incubation (versions < 1.0.0):**
- Semantic versioning is RELAXED: breaking changes may occur in any release (major, minor, or patch)
- Migration guides are NOT REQUIRED for breaking changes
- Backward compatibility is NOT GUARANTEED between releases
- Fast iteration takes precedence over stability
- Users MUST expect API changes, configuration changes, and behavior changes
- Deprecation warnings are OPTIONAL (but appreciated when practical)

**Graduation Criteria (moving to 1.0.0):**
Before graduating from incubation, the following MUST be stable and well-tested:
- [ ] Core architecture patterns (meta-server, toolbox, proxy invocation)
- [ ] Configuration schema and format
- [ ] Meta-tool schemas and behavior
- [ ] Tool naming and identification approach
- [ ] Error handling patterns
- [ ] Production usage validated by real-world deployments

**Post-Incubation (versions ≥ 1.0.0):**
- Strict semantic versioning MUST be followed
- Breaking changes MUST only occur in major version bumps
- Migration guides MUST be provided for all breaking changes
- Deprecation warnings MUST precede breaking changes by at least one minor version
- Backward compatibility MUST be maintained within major version series

**Communication Requirements:**
- README.md MUST include clear incubation status warning until 1.0.0
- Release notes for pre-1.0.0 versions SHOULD highlight breaking changes but MAY omit migration paths
- npm package description SHOULD include "incubating" or "pre-1.0" qualifier

**Rationale**: Explicit incubation policy sets clear expectations for users and maintainers. Pre-1.0 versions signal the project is still finding its optimal design and breaking changes are normal. This enables exploring different approaches (like the structured tool naming migration) without being locked into suboptimal patterns. Graduation to 1.0.0 becomes a meaningful milestone signaling production-readiness and stability commitment. Fast iteration during incubation accelerates learning and improvement without legacy burden.

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
- Breaking changes during incubation MAY use `feat!:` or `fix!:` but it is OPTIONAL
- Breaking changes after 1.0.0 MUST use `feat!:` or `fix!:` and include `BREAKING CHANGE:` in commit body
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

**Version**: 1.8.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-28
