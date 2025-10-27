# Feature Specification: Tool Naming Format Update

**Feature Branch**: `002-tool-naming-format`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "the tool naming format must be changed from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}`"

## Clarifications

### Session 2025-10-27

- Q: Version bump strategy and breaking change classification → A: Minor bump (0.4.0 → 0.5.0) with no backward compatibility whatsoever

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Separator Convention (Priority: P1)

As an MCP client developer using the workbench, I need all components of the tool name (toolbox, server, and tool) to be separated by the same delimiter so that I can reliably parse tool names without ambiguity.

**Why this priority**: This is the core change that enables predictable parsing and eliminates the inconsistency between toolbox-server separator (double underscore) and server-tool separator (single underscore). Without this change, parsing logic requires special handling for the mixed separator pattern.

**Independent Test**: Can be fully tested by opening a toolbox with multiple servers and verifying that all registered tool names follow the `{toolbox}__{server}__{tool}` format with consistent double underscores throughout.

**Acceptance Scenarios**:

1. **Given** a workbench with a toolbox containing a server named "filesystem" with a tool "read_file", **When** the toolbox is opened in dynamic mode, **Then** the registered tool name is `{toolbox}__filesystem__read_file` (not `{toolbox}__filesystem_read_file`)
2. **Given** a workbench with a toolbox containing a server named "memory" with a tool "store_value", **When** the toolbox is opened in proxy mode, **Then** the returned tool list contains tool names formatted as `{toolbox}__memory__store_value`
3. **Given** a tool name following the new format `{toolbox}__{server}__{tool}`, **When** parsing the name to extract components, **Then** the parser can split on double underscores to extract toolbox, server, and tool names without ambiguity

---

### User Story 2 - Backward Compatibility Handling (Priority: P2)

As a workbench administrator, I need clear documentation on how the naming format change affects existing clients so that I can plan migration and communicate changes to users.

**Why this priority**: While not blocking the technical implementation, clear communication about incompatible changes is essential for adoption and prevents confusion during migration.

**Independent Test**: Can be tested by reviewing documentation, changelog, and migration guide to verify they clearly explain the incompatible change, its impact, and migration steps.

**Acceptance Scenarios**:

1. **Given** the workbench documentation, **When** a user reads the changelog, **Then** the naming format change is clearly marked as an incompatible change with examples of old vs. new formats
2. **Given** existing clients using the old format, **When** they upgrade to the new version, **Then** they receive clear error messages indicating tool names have changed and pointing to migration documentation
3. **Given** a migration scenario, **When** a user follows the documented steps, **Then** they can successfully update their client code to use the new naming convention

---

### User Story 3 - Tool Name Parsing Simplification (Priority: P3)

As a developer maintaining the workbench codebase, I want simplified parsing logic for tool names so that the code is more maintainable and less error-prone.

**Why this priority**: This is an internal code quality improvement that follows naturally from the naming format change. While valuable, it's lower priority than the user-facing changes.

**Independent Test**: Can be tested by reviewing the parsing implementation to verify it uses a simple split-on-separator approach without special cases for mixed separators.

**Acceptance Scenarios**:

1. **Given** a tool name in the new format, **When** the `parseToolName()` method is called, **Then** it splits on double underscores and returns toolbox, server, and tool components
2. **Given** the parsing implementation, **When** reviewing the code, **Then** there is no special logic to handle different separator types between segments
3. **Given** tool names containing underscores in the original tool name (e.g., `read_file`), **When** parsing the full registered name, **Then** the parser correctly identifies these as part of the tool name, not additional separators

---

### Edge Cases

- What happens when a tool name already contains double underscores (e.g., `my__special__tool`)? The parser must handle this by treating only the first two double underscores as separators.
- What happens when clients attempt to call tools using the old naming format after the update? The system should return a clear error message indicating the tool name format has changed.
- How does the system handle migration from old to new format? This is an atomic incompatible change with no backward compatibility. All clients must update simultaneously when upgrading to the new version. The version will be bumped as a minor release (0.4.0 → 0.5.0) despite the incompatible nature of the change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate tool names using the format `{toolbox}__{server}__{tool}` with double underscores as separators between all components
- **FR-002**: System MUST parse tool names by splitting on double underscores to extract toolbox name, server name, and original tool name
- **FR-003**: System MUST correctly handle tool names that contain single underscores as part of the original tool name (e.g., `read_file`, `store_value`)
- **FR-004**: System MUST apply the new naming format in both dynamic mode (when registering tools) and proxy mode (when returning tool lists)
- **FR-005**: System MUST maintain the ability to distinguish between toolbox, server, and tool name components when the original tool name contains underscores
- **FR-006**: System MUST document the naming format change as an incompatible change in the changelog with clear before/after examples
- **FR-007**: System MUST provide clear error messages when tool calls use the old naming format, directing users to documentation
- **FR-008**: System MUST update package version from 0.4.0 to 0.5.0 (minor bump) to signal the new feature, despite the incompatible nature of the change

### Key Entities

- **Tool Name**: A fully qualified identifier for a tool in the format `{toolbox}__{server}__{tool}`, where:
  - `toolbox`: The name of the toolbox containing the server
  - `server`: The name of the MCP server providing the tool
  - `tool`: The original tool name from the downstream server (may contain single underscores)

- **Tool Name Parser**: A utility that splits a registered tool name into its three components (toolbox, server, tool) using double underscore as the delimiter

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All tool names registered in dynamic mode follow the `{toolbox}__{server}__{tool}` format with no instances of the old `{toolbox}__{server}_{tool}` format
- **SC-002**: Tool name parsing successfully extracts all three components (toolbox, server, tool) for 100% of registered tools, including those with underscores in the original tool name
- **SC-003**: Documentation clearly explains the incompatible change with at least 3 concrete examples showing old vs. new naming format
- **SC-004**: The parsing implementation contains no special cases or conditional logic for handling different separator patterns between segments
- **SC-005**: Package version is 0.5.0 in package.json and all release artifacts

## Assumptions *(include if making assumptions to fill gaps)*

- **Assumption 1**: Despite being an incompatible change, this will be released as a minor version bump (0.5.0) per project maintainer decision
- **Assumption 2**: All clients are expected to update their tool invocation code when upgrading to 0.5.0
- **Assumption 3**: The maximum nesting level for tool name components is three (toolbox, server, tool) - no additional hierarchy needs to be supported
- **Assumption 4**: Tool names, server names, and toolbox names do not contain double underscores as part of their identifier (if they do, the first two occurrences are treated as separators)
- **Assumption 5**: The change applies to all modes (dynamic and proxy) and all tool-related operations consistently

## Dependencies *(include if dependent on other features/systems)*

- **Dependency 1**: The `ClientManager.generateToolName()` method must be updated to use the new separator pattern
- **Dependency 2**: The `ClientManager.parseToolName()` method must be updated to parse using the new pattern
- **Dependency 3**: Documentation in [CLAUDE.md](../../CLAUDE.md) must be updated to reflect the new naming format
- **Dependency 4**: The "Tool Naming Convention" section in [CLAUDE.md](../../CLAUDE.md) must be updated with new examples
- **Dependency 5**: package.json version must be updated from 0.4.0 to 0.5.0

## Out of Scope *(include if boundaries need clarification)*

- **OOS-001**: Providing automated migration tools or scripts to convert old format to new format in client code
- **OOS-002**: Maintaining backward compatibility with the old naming format through aliasing or dual support
- **OOS-003**: Supporting custom separator patterns configurable by users
- **OOS-004**: Changing the internal structure of how tool metadata is stored (only the string representation changes)
- **OOS-005**: Following strict semantic versioning for this release (incompatible change released as minor version per maintainer decision)
