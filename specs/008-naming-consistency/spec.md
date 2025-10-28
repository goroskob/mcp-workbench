# Feature Specification: Standardize Parameter and Field Naming

**Feature Branch**: `008-naming-consistency`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "currently we have inconsistent params/fields naming:
- toolboxes: toolbox, toolbox_name
- servers: server, source_server
- tools: tool, name

leave only toolbox, server, tool"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Consumer Clarity (Priority: P1)

Developers integrating with the workbench API encounter inconsistent parameter names across different operations (e.g., `toolbox_name` in one place, `toolbox` in another). They need a consistent, predictable naming convention so they can write integration code without constantly referring to documentation or making trial-and-error API calls.

**Why this priority**: This is the foundation for a good developer experience. Without consistent naming, every API interaction becomes a source of frustration and bugs. This affects all users immediately and blocks efficient adoption.

**Independent Test**: Can be fully tested by examining all API signatures and data structures, ensuring all references use exactly `toolbox`, `server`, and `tool` without variations. Delivers immediate value by making the API predictable and self-documenting.

**Acceptance Scenarios**:

1. **Given** a developer is calling any workbench meta-tool, **When** they need to specify which toolbox to operate on, **Then** the parameter is always named `toolbox` (not `toolbox_name`)
2. **Given** a developer receives tool metadata from `open_toolbox`, **When** they inspect the tool information objects, **Then** server references use the field name `server` (not `source_server`)
3. **Given** a developer works with tool identification, **When** they reference the actual tool name, **Then** the field is always named `tool` (not `name` or `original_name`)

---

### User Story 2 - Code Maintainability (Priority: P2)

Internal maintainers working on the workbench codebase need to understand and modify type definitions, function signatures, and data structures. Inconsistent naming creates cognitive overhead and increases the chance of bugs when refactoring or adding features.

**Why this priority**: While developers can work around inconsistent naming, it slows down development velocity and increases defect rates. This is important for long-term health but doesn't block immediate usage.

**Independent Test**: Can be tested independently by reviewing all TypeScript type definitions in `src/types.ts` and verifying they use standardized names. Delivers value by making the codebase easier to navigate and modify.

**Acceptance Scenarios**:

1. **Given** a maintainer reviews type definitions, **When** they examine fields related to toolbox identification, **Then** all occurrences use `toolbox` consistently
2. **Given** a maintainer traces data flow through the codebase, **When** they follow a server reference from input to output, **Then** the field name remains `server` throughout (no `source_server` variations)
3. **Given** a maintainer searches for tool name usage, **When** they use IDE search functionality, **Then** one search term (`tool`) finds all relevant usages

---

### User Story 3 - Documentation Accuracy (Priority: P3)

Documentation readers (both API consumers and contributors) need accurate, up-to-date parameter names in all examples and reference materials. Outdated or inconsistent documentation examples lead to confusion and incorrect implementations.

**Why this priority**: Documentation can be manually verified after code changes are complete. It's important for onboarding and reference, but doesn't block functionality.

**Independent Test**: Can be tested by reviewing all markdown files and code comments, ensuring examples use standardized names. Delivers value by providing accurate reference material.

**Acceptance Scenarios**:

1. **Given** a user reads the CLAUDE.md file, **When** they review API examples, **Then** all parameter names match the standardized convention
2. **Given** a developer reads inline code comments, **When** they see references to data structures, **Then** field names in comments match actual implementation

---

### Edge Cases

- What happens when existing client code uses old parameter names (e.g., `toolbox_name`)? Will there be a deprecation period or immediate breaking change?
- How are parameter names handled in error messages and logs? Should they also use the standardized names?
- What about internal utility functions that might use variations like `toolboxName` (camelCase) for local variables?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All meta-tool input parameters MUST use `toolbox` (not `toolbox_name`) when referring to toolbox identifiers
- **FR-002**: All metadata objects returned by workbench operations MUST use `server` (not `source_server`) when referring to MCP server identifiers
- **FR-003**: All tool identification structures MUST use `tool` (not `name` or `original_name`) when referring to tool names
- **FR-004**: TypeScript type definitions in `src/types.ts` MUST use standardized field names (`toolbox`, `server`, `tool`)
- **FR-005**: All function parameters and return types throughout the codebase MUST use standardized naming conventions
- **FR-006**: Documentation files (README.md, CLAUDE.md, etc.) MUST reflect standardized parameter names in all examples
- **FR-007**: Error messages MUST reference parameters using standardized names (`toolbox`, `server`, `tool`)
- **FR-008**: The change MUST be applied consistently across all affected areas: API surface, type definitions, internal implementation, and documentation

### Key Entities

- **ToolInfo**: Metadata structure describing a tool, includes fields for `toolbox` (which toolbox contains it), `server` (which MCP server provides it), and `tool` (the tool's name)
- **Tool Identifier**: Structured object for identifying tools, contains exactly three fields: `toolbox`, `server`, and `tool`
- **OpenToolboxResult**: Return type from `open_toolbox` operation, includes tool metadata with standardized field names
- **API Parameters**: Input parameters to workbench meta-tools, use `toolbox` for toolbox identification

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of `toolbox_name`, `source_server`, or `name` (in tool identification context) remain in the public API surface
- **SC-002**: 100% of TypeScript type definitions use standardized field names (`toolbox`, `server`, `tool`)
- **SC-003**: All documentation examples compile and run successfully with standardized parameter names
- **SC-004**: Code reviewers can verify naming consistency by searching for deprecated patterns and finding zero results in API/types/documentation files
