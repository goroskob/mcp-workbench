# Feature Specification: Support Multiple Toolboxes with Duplicate Tools

**Feature Branch**: `001-duplicate-tools-support`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "the workbench may have multiple instances of the same MCP server and tool registered inside the different toolboxes.  currently, the workbench fails to open a second toolbox if it has duplicate tools"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Multiple Toolboxes with Same Server (Priority: P1)

A workbench user needs to use tools from the same MCP server instance but organized into different toolboxes for different workflows. For example, a "development" toolbox and a "production" toolbox might both connect to the same filesystem server but with different environment configurations.

**Why this priority**: This is the core functionality - allowing multiple toolboxes to coexist with overlapping server instances is the fundamental requirement. Without this, the workbench cannot support realistic multi-environment or multi-context workflows.

**Independent Test**: Can be fully tested by configuring two toolboxes that reference the same MCP server (same command/args), opening the first toolbox successfully, then opening the second toolbox without errors, and verifying both can invoke tools from their respective server instances.

**Acceptance Scenarios**:

1. **Given** workbench has two toolboxes ("dev" and "prod") both configured with the same MCP server, **When** user opens "dev" toolbox then opens "prod" toolbox, **Then** both toolboxes open successfully without errors
2. **Given** two toolboxes are open with duplicate server configurations, **When** user calls a tool from the "dev" toolbox, **Then** the tool executes against the "dev" toolbox's server instance with its specific environment/configuration
3. **Given** two toolboxes are open with duplicate server configurations, **When** user closes one toolbox, **Then** the other toolbox remains functional with its tools still accessible

---

### User Story 2 - Unique Tool Naming Across Toolboxes (Priority: P1)

A workbench user needs to invoke tools from different toolbox instances without name collisions. The same tool from different toolboxes must be distinguishable so the user can specify which instance to call.

**Why this priority**: This is critical for usability - users must be able to differentiate between `filesystem_read_file` from the "dev" toolbox vs. "prod" toolbox. Without unique naming, the system cannot route tool calls correctly.

**Independent Test**: Can be tested by opening two toolboxes with the same server/tools, listing available tools, and verifying each tool has a unique identifier that includes both the server name and toolbox context.

**Acceptance Scenarios**:

1. **Given** two toolboxes ("dev" and "prod") are open with the same server "filesystem", **When** user lists available tools, **Then** tools are uniquely identifiable (e.g., `dev__filesystem_read_file` vs. `prod__filesystem_read_file`)
2. **Given** two toolboxes with duplicate tools are open, **When** user invokes a tool using its unique name, **Then** the correct toolbox instance handles the request
3. **Given** multiple toolboxes are open, **When** user queries tool metadata or descriptions, **Then** each tool's metadata indicates which toolbox it belongs to

---

### User Story 3 - Independent Toolbox Lifecycle Management (Priority: P2)

A workbench user needs to open and close toolboxes independently without affecting other open toolboxes, even when they share the same underlying MCP servers.

**Why this priority**: This enables flexible workflow management - users can activate/deactivate contexts as needed without disrupting unrelated workflows. It's slightly lower priority than P1 because basic functionality can work with manual toolbox management.

**Independent Test**: Can be tested by opening three toolboxes (where two share a server), closing the middle one, and verifying the remaining toolboxes still function correctly with all tools accessible.

**Acceptance Scenarios**:

1. **Given** three toolboxes are open ("dev", "staging", "prod") where "dev" and "prod" both use "filesystem" server, **When** user closes "dev" toolbox, **Then** "staging" and "prod" remain open with their tools still functional
2. **Given** two toolboxes share the same server connection, **When** one toolbox is closed, **Then** only that toolbox's tools are unregistered, not the duplicate server's tools from the other toolbox
3. **Given** all toolboxes are closed, **When** user reopens any toolbox, **Then** it initializes successfully regardless of previous duplicate configurations

---

### Edge Cases

- What happens when more than two toolboxes reference the same MCP server (e.g., 5 toolboxes all use "filesystem")?
- How does the system handle closing and reopening the same toolbox multiple times in a session?
- What happens if two toolboxes have the same name but different server configurations?
- How does the system handle tool name collisions when toolbox names themselves contain underscores or special characters?
- What happens when a toolbox with duplicate servers fails to connect - does it affect other open toolboxes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow multiple toolboxes to be opened simultaneously even when they contain the same MCP server configurations (same command, args, or server name)
- **FR-002**: System MUST generate unique tool identifiers that include both toolbox context and server name to prevent name collisions (e.g., `{toolbox}__{server}_{tool}`)
- **FR-003**: System MUST maintain separate server connection instances for each toolbox, even when the same server configuration is used
- **FR-004**: System MUST route tool invocations to the correct toolbox's server instance based on the tool's unique identifier
- **FR-005**: System MUST allow independent toolbox lifecycle operations (open/close) without affecting other toolboxes that share the same server configurations
- **FR-006**: System MUST unregister only the specific toolbox's tools when a toolbox is closed, leaving duplicate server instances from other toolboxes intact
- **FR-007**: System MUST provide clear metadata for each registered tool indicating which toolbox it belongs to
- **FR-008**: System MUST handle errors in one toolbox's server connection without affecting duplicate server instances in other toolboxes
- **FR-009**: System MUST support both dynamic mode and proxy mode with duplicate tool handling (unique naming applies to both modes)
- **FR-010**: System MUST validate that tool invocation requests specify the correct toolbox context when multiple instances of the same tool exist

### Key Entities

- **Toolbox Instance**: Represents an opened toolbox with its own set of server connections and registered tools, identified by toolbox name
- **Server Connection**: Represents a connection to a specific MCP server, owned by a specific toolbox instance (duplicates allowed across toolboxes)
- **Registered Tool**: Represents a tool from an MCP server, uniquely identified by `{toolbox}__{server}_{tool}` format, with metadata linking it to both its source server and owning toolbox

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully open 5+ toolboxes with duplicate MCP server configurations without errors or connection failures
- **SC-002**: Each tool from duplicate server instances is uniquely addressable and invocable without confusion or routing errors
- **SC-003**: Closing a toolbox with duplicate servers completes in under 2 seconds and does not disrupt other open toolboxes
- **SC-004**: Tool invocation success rate remains at 100% for correctly-formed requests regardless of how many duplicate server instances are active
- **SC-005**: Zero conflicts or name collision errors occur when opening toolboxes with overlapping server configurations
- **SC-006**: Users can identify which toolbox a tool belongs to within 3 seconds by examining tool metadata or naming

## Assumptions *(include if making assumptions)*

- Each toolbox is identified by a unique name in the configuration file
- Toolbox names do not contain double underscores (`__`) which are reserved for tool name formatting
- MCP server connections can be instantiated multiple times with different configurations (environment variables, working directories)
- The existing tool naming convention `{server}_{tool}` can be extended to `{toolbox}__{server}_{tool}` without breaking backward compatibility
- In dynamic mode, the MCP SDK supports registering tools with duplicate base names as long as the full registered name is unique
- In proxy mode, the `workbench_use_tool` meta-tool can accept toolbox-qualified tool names

## Out of Scope *(include if scope needs clarification)*

- Sharing server connections across toolboxes (each toolbox maintains its own connection pool)
- Automatic detection and reuse of identical server instances to save resources
- Merging or deduplicating tools from multiple toolboxes into a single namespace
- Configuration-time validation to prevent duplicate server definitions (this is an allowed use case, not an error)
- User interface or visualization for managing multiple toolboxes simultaneously
