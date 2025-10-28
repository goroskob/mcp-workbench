# Feature Specification: Remove Manual Toolbox Closing

**Feature Branch**: `004-remove-manual-close`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "there is no need close toolboxes manually. Thus, no need for tool to close"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simplified Toolbox Lifecycle (Priority: P1)

Users interact with toolboxes by opening them when needed, without needing to explicitly close them. The system manages toolbox lifecycle automatically, removing the cognitive burden of manual cleanup.

**Why this priority**: This is the core simplification - users should focus on their work, not resource management. Removing manual close operations reduces API surface area and potential errors.

**Independent Test**: Can be fully tested by opening toolboxes and verifying they work without requiring any close operation, and the system handles cleanup automatically.

**Acceptance Scenarios**:

1. **Given** a user has opened a toolbox, **When** they finish using it and don't call close, **Then** the system continues to function normally without resource leaks
2. **Given** a user wants to use tools from a toolbox, **When** they open the toolbox, **Then** tools become available without requiring subsequent close operations
3. **Given** a user has multiple toolboxes open, **When** they interact with tools from any toolbox, **Then** all toolboxes remain functional without manual lifecycle management

---

### User Story 2 - Clean API Surface (Priority: P2)

Users work with a simplified API that only includes necessary operations (list and open toolboxes), making the system easier to understand and use.

**Why this priority**: API simplification reduces learning curve and prevents misuse. Users can't accidentally break their workflow by forgetting to close or closing prematurely.

**Independent Test**: Can be tested by examining the available workbench tools and verifying that only list and open operations are exposed.

**Acceptance Scenarios**:

1. **Given** a user queries available workbench operations, **When** they review the tool list, **Then** only list_toolboxes and open_toolbox operations are available
2. **Given** a user follows API documentation, **When** they implement toolbox usage, **Then** they only need to consider open operations, not close
3. **Given** existing code that uses close operations, **When** the feature is deployed, **Then** those calls will fail with tool-not-found errors (no backward compatibility in incubating phase)

---

### Edge Cases

- What happens when a user opens the same toolbox multiple times?
- How does the system handle cleanup when the workbench server terminates (graceful shutdown vs crash)?
- What happens to active tool calls when the server shuts down?
- How are resources managed if a user opens many toolboxes sequentially?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove the `workbench_close_toolbox` tool from the registered workbench meta-tools
- **FR-002**: System MUST handle automatic cleanup of toolbox connections when the workbench server shuts down
- **FR-003**: System MUST maintain all opened toolbox connections until server shutdown
- **FR-004**: System MUST continue to support `workbench_list_toolboxes` and `workbench_open_toolbox` operations without changes to their behavior
- **FR-005**: System MUST handle multiple opens of the same toolbox as idempotent operations (no-op, return success immediately if already open)
- **FR-006**: System MUST properly clean up all MCP client connections and resources during server termination (SIGINT/SIGTERM handlers)

### Key Entities

- **Toolbox**: A logical grouping of MCP servers that can be opened to make their tools available. Once opened, remains active until server shutdown.
- **Server Connection**: Active connection to a downstream MCP server within a toolbox. Lifecycle managed automatically by the workbench.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open toolboxes and use their tools without requiring any close operation
- **SC-002**: System properly releases all resources (connections, file handles, memory) when workbench server terminates
- **SC-003**: API surface area is reduced by removing one meta-tool (close_toolbox)
- **SC-004**: Users opening and using toolboxes experience no resource leaks during normal operation
- **SC-005**: System handles graceful shutdown within 5 seconds, cleaning up all active connections

## Assumptions

- **Assumption 1**: Toolboxes are lightweight enough that keeping them open for the duration of the server session doesn't cause resource exhaustion
- **Assumption 2**: Users typically work with a bounded number of toolboxes (not hundreds) during a single session
- **Assumption 3**: The workbench server has a defined lifecycle with clear start and stop points (not a long-running daemon that never restarts)
- **Assumption 4**: Existing SIGINT/SIGTERM handlers can be extended to handle cleanup of all opened toolboxes
- **Assumption 5**: The benefits of API simplification outweigh the loss of fine-grained resource control

## Dependencies

- Proper signal handling (SIGINT/SIGTERM) must be implemented or enhanced to ensure cleanup
- Documentation and examples must be updated to remove references to close operations
- If proxy mode or dynamic mode have different close behaviors, both must be addressed

## Scope

### In Scope

- Removal of `workbench_close_toolbox` tool registration
- Automatic cleanup of all toolbox connections during server shutdown
- Updates to ensure opened toolboxes remain stable for server lifetime
- Handling of edge cases (multiple opens, cleanup during shutdown)

### Out of Scope

- Implementing resource limits or quotas on opened toolboxes
- Adding connection pooling or advanced resource management
- Changing the behavior of `workbench_list_toolboxes` or `workbench_open_toolbox`
- Implementing automatic idle timeout for unused toolboxes
- Adding monitoring or metrics for resource usage
