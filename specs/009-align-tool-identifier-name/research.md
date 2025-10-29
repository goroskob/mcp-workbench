# Research: Align Tool Identifier Property with MCP SDK Naming

**Feature**: 009-align-tool-identifier-name
**Date**: 2025-10-28
**Status**: Complete

## Overview

This research document captures the investigation into aligning the workbench's structured tool identifier naming with the official MCP SDK standards.

## Research Questions

### Q1: What property name does the MCP SDK's Tool interface use for tool identification?

**Finding**: The MCP SDK's Tool interface uses `name` as the property for tool identification.

**Evidence**:
- The @modelcontextprotocol/sdk package defines Tool interface with `name` property
- MCP protocol specification uses `name` consistently across tool definitions
- All official MCP server implementations (server-memory, server-filesystem) use `name` in their tool definitions

**Conclusion**: The workbench should use `name` to align with this standard convention.

### Q2: Are there any technical constraints preventing this rename?

**Finding**: No technical constraints. The property rename is purely an API surface change.

**Analysis**:
- The structured tool identifier is defined in ToolIdentifierSchema (Zod schema)
- Property is accessed in ~5 locations in src/index.ts
- Change requires updating schema definition, accessor code, documentation, and error messages
- No runtime behavior changes - only API interface naming

**Conclusion**: This is a safe breaking API change with no technical blockers.

### Q3: What is the impact radius of this change?

**Finding**: Narrow impact radius within well-defined boundaries.

**Affected Components**:
1. **Schema Definition**: ToolIdentifierSchema in src/index.ts (line 35)
2. **Code Usage**: Lines accessing `params.tool.tool` → `params.tool.name` (5-6 locations)
3. **Documentation**: Inline tool descriptions, README.md, CLAUDE.md examples
4. **Constitution**: Principle II examples showing structured identifier format
5. **Error Messages**: References to the tool identifier field

**Not Affected**:
- Configuration schema (no changes)
- Connection management (no changes)
- Tool registration/delegation logic (no changes)
- Client-manager implementation (may need review but likely no changes)

**Conclusion**: Small, focused change with clear boundaries.

## Decisions

### Decision 1: Use `name` for consistency with MCP SDK

**Chosen Approach**: Rename `tool` property to `name` in structured tool identifier

**Rationale**:
- Aligns with official MCP SDK Tool interface naming
- Reduces cognitive overhead for developers familiar with MCP standards
- Makes workbench feel like natural extension of MCP ecosystem
- Improves API consistency and predictability

**Alternatives Considered**:
1. **Keep `tool` property**: Rejected - perpetuates inconsistency with MCP SDK
2. **Use both `tool` and `name` (alias)**: Rejected - adds complexity and ambiguity
3. **Add `name` property, deprecate `tool`**: Rejected - unnecessary complexity during incubation

**Trade-offs**:
- **Pro**: Better alignment with MCP standards, reduced learning curve for MCP developers
- **Pro**: Clearer semantic meaning (name of the tool vs ambiguous "tool" term)
- **Con**: Breaking change requiring client code updates
- **Con**: Need to update constitution principle examples

**Justification**: During incubation, breaking changes are permitted and encouraged for improving API design. The benefits of MCP SDK alignment outweigh the migration cost, especially at current low adoption.

### Decision 2: No compatibility layer during incubation

**Chosen Approach**: Make clean break, no backwards compatibility

**Rationale**:
- Project is in incubation (v0.12.0) where breaking changes are expected
- Maintaining compatibility layer adds complexity without long-term value
- Clean API is more important than short-term backwards compatibility pre-1.0

**Alternatives Considered**:
1. **Support both `tool` and `name`**: Rejected - adds technical debt and ambiguity
2. **Gradual deprecation with warnings**: Rejected - unnecessary during incubation

### Decision 3: Update constitution Principle II

**Chosen Approach**: Amend Principle II examples to use `name` instead of `tool`

**Rationale**:
- Constitution examples should reflect current best practices
- This is a clarification/improvement, not a fundamental principle change
- The three-level identification pattern (toolbox + server + tool name) remains unchanged

**Constitution Amendment**: Version bump to 1.10.0 (minor - expanded guidance on MCP SDK alignment)

## Best Practices

### Property Naming in MCP SDK

**Standard Pattern**:
- Tool interface uses `name` for tool identifier
- Server interface uses `name` for server identifier
- Consistent use of `name` across MCP protocol entities

**Application to Workbench**:
- Structured tool identifier should use `name` for tool name property
- Maintains consistency with broader MCP ecosystem
- Makes integration with MCP-aware tooling more natural

### Breaking Changes During Incubation

**Guidance**:
- Breaking changes are encouraged when they improve API design
- No migration guides required during incubation (but helpful when practical)
- Clear communication in release notes is sufficient
- Fast iteration over backwards compatibility

## Implementation Guidance

### Code Changes Required

1. **Schema Update** (src/index.ts:35):
   ```typescript
   // Before
   const ToolIdentifierSchema = z.object({
     toolbox: z.string().min(1, "Toolbox name cannot be empty"),
     server: z.string().min(1, "Server name cannot be empty"),
     tool: z.string().min(1, "Tool name cannot be empty"),
   }).strict();

   // After
   const ToolIdentifierSchema = z.object({
     toolbox: z.string().min(1, "Toolbox name cannot be empty"),
     server: z.string().min(1, "Server name cannot be empty"),
     name: z.string().min(1, "Tool name cannot be empty"),
   }).strict();
   ```

2. **Usage Updates** (src/index.ts):
   - Line 338: `const { toolbox, server, tool } = params.tool;` → `const { toolbox, server, name } = params.tool;`
   - Line 341-344: Update findToolInToolbox call to pass `name` instead of `tool`
   - Line 349: Update callTool to use `name: name` instead of `name: tool`
   - Line 359: Error message uses `params.tool.tool` → `params.tool.name`

3. **Documentation Updates**:
   - Update inline tool descriptions (lines 276, 285, 296)
   - Update README.md examples
   - Update CLAUDE.md type system documentation

4. **Constitution Update**:
   - Update Principle II examples from `{ toolbox, server, tool }` to `{ toolbox, server, name }`
   - Bump version to 1.10.0

### Validation Approach

**Pre-Implementation**:
- Review all occurrences of `params.tool.tool` pattern
- Identify all documentation references to `tool` field in structured identifier context

**Post-Implementation**:
- Search for remaining `tool` property references in structured identifier contexts
- Verify error messages reference `name` field
- Test with actual tool invocation to confirm schema validation works
- Verify TypeScript compilation passes

## Open Items

*None - research complete, all decisions made.*

## References

- MCP SDK Tool interface: @modelcontextprotocol/sdk
- Feature specification: [spec.md](./spec.md)
- Constitution Principle II: Tool Naming and Conflict Resolution
- Related: 008-naming-consistency (standardized field names to toolbox, server, tool)
