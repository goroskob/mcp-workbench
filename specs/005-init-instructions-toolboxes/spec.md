# Feature Specification: Initialization Instructions for Toolboxes

**Feature Branch**: `005-init-instructions-toolboxes`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "remove workbench_list_toolboxes. Replace it with the 'instructions' field in the initialization step, to provide the list of toolboxes on mcp-workbench initialization"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Available Toolboxes on Connection (Priority: P1)

As an MCP client connecting to the workbench for the first time, I need to see which toolboxes are available immediately during initialization, so I can understand my options without making an additional tool call.

**Why this priority**: This is the core value proposition - reducing round-trips and making toolbox discovery part of the standard MCP handshake. Every client connecting to the workbench benefits from this immediate visibility.

**Independent Test**: Can be fully tested by connecting any MCP client to the workbench and inspecting the initialization response's `instructions` field. Delivers immediate toolbox awareness without requiring any tool calls.

**Acceptance Scenarios**:

1. **Given** a workbench server with 3 configured toolboxes, **When** an MCP client sends an `initialize` request, **Then** the server's `initialize` response includes an `instructions` field listing all 3 toolboxes with their names and descriptions
2. **Given** a workbench server with no toolboxes configured, **When** an MCP client sends an `initialize` request, **Then** the server's `initialize` response includes an `instructions` field indicating no toolboxes are available
3. **Given** a workbench server with 1 toolbox containing 5 tools, **When** an MCP client sends an `initialize` request, **Then** the toolbox listing in `instructions` shows the toolbox name, description, and tool count (5)

---

### User Story 2 - Streamlined Client Onboarding (Priority: P2)

As an MCP client developer, I want to eliminate the need to call `workbench_list_toolboxes` as a separate step, so my client implementation is simpler and follows standard MCP patterns.

**Why this priority**: This improves developer experience and reduces implementation complexity for client developers. It's secondary to the core functionality but important for adoption.

**Independent Test**: Can be tested by writing a minimal MCP client that only uses initialization data to display toolboxes. Delivers value by simplifying client code and reducing protocol overhead.

**Acceptance Scenarios**:

1. **Given** an existing MCP client that previously called `workbench_list_toolboxes`, **When** the client is updated to use initialization instructions instead, **Then** the client can display the same toolbox information without making the tool call
2. **Given** a new MCP client implementation, **When** the client connects to the workbench, **Then** all toolbox discovery can be completed using only the initialization response

---

### User Story 3 - Remove Legacy Tool (Priority: P3)

As a workbench maintainer, I want to remove the redundant `workbench_list_toolboxes` tool, so the codebase is cleaner and there's only one way to discover toolboxes.

**Why this priority**: This is cleanup and technical debt reduction. While valuable for long-term maintainability, it doesn't directly add user value and can be done after the initialization instructions are working.

**Independent Test**: Can be tested by verifying the tool is removed from the codebase and no longer appears in the workbench's tool list. Delivers value through simplified maintenance.

**Acceptance Scenarios**:

1. **Given** a workbench server with the new initialization instructions feature, **When** an MCP client queries the available tools, **Then** `workbench_list_toolboxes` does not appear in the tools list
2. **Given** a workbench server with the old `workbench_list_toolboxes` tool removed, **When** an MCP client attempts to call `workbench_list_toolboxes`, **Then** the server returns a "tool not found" error

---

### Edge Cases

- **Invalid/missing configuration**: Server fails to start during configuration loading phase; initialization is never reached (fail-fast principle)
- **Very long toolbox descriptions**: No truncation applied; instructions field includes full descriptions; MCP protocol has no strict message size limit for initialization responses
- **Format**: Plain text with line breaks and indentation (resolved in FR-007)
- **Stale instructions after config change**: Clients must reconnect to see updated toolbox listings; dynamic updates out of scope (documented in Out of Scope section)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Server MUST include an `instructions` field in the `initialize` response containing a listing of all configured toolboxes
- **FR-002**: Toolbox listing MUST include each toolbox's name, description, and tool count
- **FR-003**: Instructions field MUST be human-readable and formatted for display to users or agents
- **FR-004**: Server MUST generate toolbox listing from the same configuration source used by the legacy `workbench_list_toolboxes` tool
- **FR-005**: Server MUST remove the `workbench_list_toolboxes` tool from the registered tools list
- **FR-006**: Instructions field MUST handle edge cases gracefully (no toolboxes, empty descriptions, zero tools)
- **FR-007**: Instructions field format MUST use plain text with simple line breaks and indentation for presenting toolbox information

### Key Entities *(include if feature involves data)*

- **Toolbox Metadata**: Represents information about a configured toolbox including name (unique identifier), description (purpose/usage), tool count (number of available tools), and server count (number of MCP servers)
- **Initialization Instructions**: Text content provided during MCP initialization handshake, includes formatted toolbox listing and usage guidance

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: MCP clients can discover all available toolboxes without making any tool calls after initialization
- **SC-002**: Initialization response time increases by less than 100ms compared to baseline (without instructions field)
- **SC-003**: 100% of toolbox information previously available via `workbench_list_toolboxes` is now available in initialization instructions
- **SC-004**: Client developers can complete toolbox discovery integration using only initialization response documentation

### Non-Functional Requirements

- **NFR-001**: **Performance**: Instructions generation adds <100ms to initialization time (typically <1ms for up to 50 toolboxes)
- **NFR-002**: **Observability**: No special logging required; instructions generation is a pure function with errors caught at configuration load time
- **NFR-003**: **Reliability**: Instructions generation cannot fail if configuration is valid (stateless, deterministic operation)

## Clarifications

### Session 2025-10-28

- Q: Version bump strategy - minor vs major for removing `workbench_list_toolboxes` tool? → A: Minor bump (0.8.0 → 0.9.0) with tool removal, accepting this violates semantic versioning for simplicity
- Q: What happens when the workbench configuration file is invalid or missing at initialization time? → A: Server fails to start if config invalid/missing - initialization never reached (fail-fast at startup)
- Q: How to handle very long toolbox descriptions that might exceed message size limits? → A: No truncation - include full descriptions; assume reasonable description lengths in configuration
- Q: Logging/observability requirements for instructions generation? → A: No special logging - instructions generation is a simple pure function, errors caught at config load
- Q: Migration communication strategy for removed tool? → A: Silent removal - assume low usage, no special communication beyond standard CHANGELOG entry

## Assumptions *(include if relevant)*

- The MCP specification supports an `instructions` field in the initialization response (based on the user's reference to this field)
- Toolbox configurations are loaded and validated before the first client connection
- The instructions field has no strict character limit that would prevent listing all toolboxes
- Existing clients using `workbench_list_toolboxes` will need to be updated
- This will be released as a **MINOR version bump** (e.g., 0.8.0 → 0.9.0) despite removing a public tool, for project simplicity

## Out of Scope *(include if clarifying boundaries)*

- Dynamic toolbox updates after initialization (clients must reconnect to see config changes)
- Backward compatibility for clients that depend on `workbench_list_toolboxes` tool
- Deprecation warnings or migration notices (silent removal approach)
- Interactive toolbox selection or filtering based on client capabilities
- Detailed tool listings within each toolbox (only metadata and counts)
