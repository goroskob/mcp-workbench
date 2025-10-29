# Feature Specification: Align Tool Identifier Property with MCP SDK Naming

**Feature Branch**: `009-align-tool-identifier-name`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "in the structured tool identifier, align the naming with the official MCP lib by renaming the 'tool' property to 'name'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent API Naming with MCP SDK (Priority: P1)

Developers integrating with the workbench who are already familiar with the official MCP SDK encounter a naming inconsistency. The MCP SDK's Tool interface uses `name` for the tool identifier, but the workbench's structured tool identifier uses `tool`. This creates cognitive overhead and requires developers to mentally map between two different naming conventions when working with both systems. Developers need consistent naming that matches the official MCP SDK so they can leverage their existing knowledge and write more intuitive integration code.

**Why this priority**: This is critical for developer experience and API consistency. Aligning with the official MCP SDK naming conventions reduces friction for developers who are familiar with MCP standards, making the workbench feel like a natural extension of the MCP ecosystem rather than a separate system with different conventions.

**Independent Test**: Can be fully tested by examining the structured tool identifier schema and verifying that the property is named `name` instead of `tool`, matching the MCP SDK's Tool interface. Delivers immediate value by making the API more intuitive for MCP-familiar developers.

**Acceptance Scenarios**:

1. **Given** a developer reads the `use_tool` API documentation, **When** they examine the structured tool identifier format, **Then** the property is named `name` (matching MCP SDK convention) instead of `tool`
2. **Given** a developer constructs a tool invocation request, **When** they specify the tool identifier, **Then** they use `{ toolbox, server, name }` format that aligns with MCP SDK's `name` property
3. **Given** a developer reviews error messages related to tool invocation, **When** they see references to the tool identifier field, **Then** the messages reference `name` consistently with MCP SDK terminology

---

### User Story 2 - Reduced Cognitive Overhead (Priority: P2)

API consumers who work across multiple MCP-compliant systems need consistent naming conventions to reduce mental context switching. When property names differ between the workbench and the MCP SDK, developers must constantly translate between conventions, increasing cognitive load and error potential.

**Why this priority**: While the workbench functions correctly with the current naming, inconsistent conventions create unnecessary friction. This is important for adoption and developer satisfaction but doesn't block core functionality.

**Independent Test**: Can be tested by surveying developers familiar with MCP SDK who can confirm that `name` matches their mental model from working with MCP Tool interfaces. Delivers value by reducing learning curve and mental overhead.

**Acceptance Scenarios**:

1. **Given** a developer familiar with MCP SDK Tool interface, **When** they use the workbench's structured tool identifier, **Then** they can apply their existing knowledge without learning different terminology
2. **Given** documentation readers comparing workbench API to MCP SDK, **When** they review tool identifier structure, **Then** they see consistent `name` property usage across both systems

---

### Edge Cases

- What happens to existing client code that uses the current `tool` property? This is a breaking change requiring migration.
- How are internal variable names handled? Should local variables also change from `tool` to `name` or can they remain as `tool` for clarity?
- Are there error messages or logs that reference the `tool` property that need updating?
- How should documentation distinguish between "the tool" (general concept) and "the `name` field" (specific property)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The structured tool identifier schema MUST use `name` property instead of `tool` property
- **FR-002**: All API documentation MUST reference the tool identifier field as `name` not `tool`
- **FR-003**: All examples showing structured tool identifier format MUST use `{ toolbox, server, name }` structure
- **FR-004**: All code that accesses the tool identifier property MUST use `name` instead of `tool`
- **FR-005**: All error messages referencing the tool identifier field MUST use `name` terminology
- **FR-006**: The change MUST be applied consistently across: schema definitions, documentation, implementation code, examples, and error messages
- **FR-007**: Validation error messages MUST reference `name` field when reporting issues with tool identifier structure

### Key Entities

- **Structured Tool Identifier**: The object format `{ toolbox, server, name }` used to uniquely identify a tool in the workbench system, where `name` matches the MCP SDK's Tool interface naming convention
- **Tool Interface (MCP SDK)**: The official MCP protocol's definition of a tool which includes a `name` property as the tool identifier
- **ToolIdentifierSchema**: Zod schema definition that validates the structured tool identifier, currently using `tool` property but needs to change to `name`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of `tool` property in the structured tool identifier schema within src/ directory
- **SC-002**: All structured tool identifier usages consistently reference the `name` property
- **SC-003**: Code reviewers familiar with MCP SDK can verify that the workbench tool identifier structure matches MCP naming conventions
- **SC-004**: Developers familiar with MCP SDK can use the workbench's structured tool identifier without referring to documentation for field names

## Scope *(optional)*

### In Scope

- Renaming `tool` property to `name` in the ToolIdentifierSchema (src/index.ts line 35)
- Updating all code that accesses `params.tool.tool` to use `params.tool.name` instead
- Updating all documentation references from `tool` field to `name` field in structured tool identifier contexts
- Updating examples showing structured tool identifier format
- Updating error messages that reference the tool identifier field
- Updating validation messages for the `name` field

### Out of Scope

- Changing references to "tool" as a general concept (only the property name changes)
- Changing local variable names (can remain as `tool` for readability when the context is clear)
- Updating the parameter name `tool` in `UseToolInputSchema` (which holds the entire structured identifier)
- Historical documentation in CHANGELOG or past specs (preserved as historical record)

## Assumptions *(optional)*

- This is a breaking change that will require client code updates
- The MCP SDK's Tool interface uses `name` as the standard property for tool identifiers
- Aligning with MCP SDK conventions improves long-term maintainability and developer experience
- The property rename doesn't change functionality, only the API surface naming
- Existing clients will need migration guidance (but migration guide creation is out of scope per incubation policy)

## Dependencies *(optional)*

- **Reference**: MCP SDK Tool interface definition (uses `name` property)
- **Prerequisite**: 008-naming-consistency is merged (already completed)
- **Impact**: This is a breaking change that affects all API consumers using `use_tool` with structured identifiers

## Open Questions *(optional)*

*No open questions - the change is straightforward: rename the `tool` property to `name` in the structured tool identifier to match MCP SDK naming.*
