# Feature Specification: Structured Tool Names

**Feature Branch**: `007-structured-tool-names`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "i aim to completely rework tool naming. Instead of working with {toolbox}__{server}__{tool} strings, the app should work with structured tools objects: { \"toolbox\": \"toolbox_name\", \"server\": ..., \"tool\": ... }. This applies to both internal representations throughout the mcp-workbench code, and to params format. We're still incubating, so this will be a minor version bump"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invoke Tools with Structured Names (Priority: P1)

As an MCP client user, I need to invoke downstream tools by providing a structured object with toolbox, server, and tool fields instead of parsing concatenated strings, so that tool invocation is more explicit and less error-prone.

**Why this priority**: This is the core value of the feature - making tool invocation clearer and more maintainable for MCP client users. Without this, the entire feature provides no value.

**Independent Test**: Can be fully tested by opening a toolbox and calling `use_tool` with the new structured parameter format, delivering successful tool execution.

**Acceptance Scenarios**:

1. **Given** a toolbox is opened, **When** I call `use_tool` with structured tool name `{ "toolbox": "dev", "server": "filesystem", "tool": "read_file" }` and valid arguments, **Then** the tool executes successfully and returns results from the downstream server
2. **Given** multiple toolboxes are open with servers having identical tool names, **When** I call `use_tool` with different structured names specifying different toolboxes, **Then** each call routes to the correct downstream server
3. **Given** a toolbox with multiple servers, **When** I call `use_tool` with different server names in the structured tool object, **Then** each call routes to the intended server

---

### User Story 2 - Discover Tools with Structured Metadata (Priority: P1)

As an MCP client user, I need to receive tool information with separate toolbox, server, and tool name fields instead of concatenated strings, so that I can easily construct tool invocation requests without parsing logic.

**Why this priority**: Critical for usability - users need to know how to structure their `use_tool` calls. Without clear structured metadata, users must guess the format or parse strings.

**Independent Test**: Can be tested by calling `open_toolbox` and verifying that tool information includes separate structured fields.

**Acceptance Scenarios**:

1. **Given** I call `open_toolbox` with a valid toolbox name, **When** the operation completes, **Then** each tool in the response includes separate `toolbox_name`, `source_server`, and `name` (original tool name) fields
2. **Given** a toolbox with multiple servers providing the same tool name, **When** I open the toolbox, **Then** the tool list clearly distinguishes tools by their structured metadata (different `source_server` values)
3. **Given** I receive tool information from `open_toolbox`, **When** I construct a `use_tool` call using the provided fields, **Then** the fields map directly to the required structured parameter format

---

### User Story 3 - Readable Error Messages (Priority: P2)

As an MCP client user, when my tool invocation fails, I need error messages that reference toolbox, server, and tool names separately, so that I can quickly identify which component caused the failure.

**Why this priority**: Improves debugging experience but doesn't affect core functionality. Users can still use the feature without enhanced error messages.

**Independent Test**: Can be tested by triggering various error conditions and verifying error message structure.

**Acceptance Scenarios**:

1. **Given** I call `use_tool` with an invalid toolbox name, **When** the error occurs, **Then** the error message clearly states which toolbox was not found (e.g., "Toolbox 'dev' not found")
2. **Given** a toolbox is open but I specify a non-existent server, **When** the error occurs, **Then** the error message identifies the missing server within the specific toolbox (e.g., "Server 'database' not found in toolbox 'dev'")
3. **Given** I specify a non-existent tool, **When** the error occurs, **Then** the error message identifies the missing tool within the specific server (e.g., "Tool 'delete_all' not found in server 'filesystem' (toolbox 'dev')")

---

### Edge Cases

- What happens when a tool name contains double underscores (`__`) that would have caused parsing ambiguity in the old string-based format?
- How does the system handle empty string values in any of the structured fields (toolbox, server, or tool)?
- What validation occurs when a user provides a structured tool object with extra fields or missing required fields?
- How are backward compatibility concerns addressed if existing MCP clients expect the old string format?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `use_tool` meta-tool MUST accept a structured tool identifier with three required fields: `toolbox` (string), `server` (string), and `tool` (string)
- **FR-002**: The `open_toolbox` response MUST include separate `toolbox_name`, `source_server`, and `name` fields for each tool (avoiding concatenated tool names)
- **FR-003**: Internal code MUST represent tool identities using structured objects (with toolbox, server, tool fields) instead of concatenated strings
- **FR-004**: The system MUST validate that all three fields (toolbox, server, tool) are non-empty strings in the structured format
- **FR-005**: Tool routing logic MUST use the structured fields directly without string parsing or concatenation
- **FR-006**: Error messages MUST reference toolbox, server, and tool names as separate components rather than concatenated strings
- **FR-007**: Type definitions MUST use TypeScript interfaces for structured tool identifiers rather than string types
- **FR-008**: The system MUST handle tool names containing special characters (including `__`) without parsing ambiguity
- **FR-009**: Documentation and examples MUST reflect the structured parameter format for all tool invocations

### Key Entities

- **ToolIdentifier**: Structured object with three string fields (`toolbox`, `server`, `tool`) that uniquely identifies a tool within the workbench
- **ToolInfo**: Metadata object returned by `open_toolbox` containing tool schema and separate name components (`toolbox_name`, `source_server`, `name`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: MCP client users can invoke any downstream tool by providing a structured object without requiring string concatenation or parsing logic
- **SC-002**: Tool discovery (via `open_toolbox`) returns metadata where toolbox, server, and tool names are directly usable in `use_tool` calls without transformation
- **SC-003**: System correctly routes 100% of tool invocations regardless of special characters in tool names (including underscores, hyphens, dots)
- **SC-004**: Error messages include specific field references (e.g., "toolbox 'X' not found") in 100% of failure scenarios
- **SC-005**: Codebase contains zero instances of string-based tool name parsing (e.g., `split('__')`) after migration
- **SC-006**: All TypeScript type definitions use structured interfaces instead of string types for tool identification

### Assumptions

- **A-001**: This is a breaking change requiring a minor version bump (project is pre-1.0.0 incubation phase where minor versions can include breaking changes)
- **A-002**: No backward compatibility is required - all MCP clients using the workbench must upgrade to the new structured format
- **A-003**: The structured format applies to all tool-related operations, both in API parameters and internal representations
- **A-004**: Tool names, server names, and toolbox names follow standard naming conventions (alphanumeric with underscores/hyphens) but may include special characters that would be problematic in concatenated strings
