# Research: Standardize Parameter and Field Naming

**Feature**: 008-naming-consistency
**Date**: 2025-10-28
**Status**: Complete

## Overview

This document consolidates research findings for standardizing parameter and field naming across the MCP Workbench codebase. The feature is a refactoring effort to eliminate naming inconsistencies that create API confusion and developer friction.

## Decision: Standardized Field Names

### What Was Chosen

Use **exactly three field names** across all contexts:
- `toolbox` - For toolbox identifiers (instead of `toolbox_name`)
- `server` - For MCP server identifiers (instead of `source_server`)
- `tool` - For tool names (instead of `name` or `original_name`)

### Rationale

**1. Consistency with Existing Structure**: The `ToolIdentifier` interface (introduced in v0.11.0 for structured tool naming) already uses `toolbox`, `server`, and `tool`. Standardizing other types to match eliminates cognitive overhead when developers work with tool identification vs tool metadata.

**2. Shorter, Clearer Names**:
- `toolbox` is shorter than `toolbox_name` and the `_name` suffix is redundant
- `server` is shorter than `source_server` and clearer (the "source" prefix doesn't add semantic value)
- `tool` is more direct than `name` (which is ambiguous - name of what?)

**3. Reduced Search Friction**: Developers can use a single search term (`toolbox`, `server`, `tool`) to find all usages instead of having to search multiple variations.

**4. API Predictability**: When calling `open_toolbox`, the parameter name `toolbox` is more predictable than `toolbox_name`. This reduces trial-and-error API usage.

### Alternatives Considered

**Alternative 1: Keep Current Names (`toolbox_name`, `source_server`, `name`)**
- **Rejected because**: This perpetuates the existing inconsistency with ToolIdentifier and continues causing developer confusion. The problem gets worse over time as more code is written using inconsistent conventions.

**Alternative 2: Use Longer Descriptive Names (`toolbox_identifier`, `server_identifier`, `tool_identifier`)**
- **Rejected because**: These names are unnecessarily verbose. The context already makes it clear these are identifiers. TypeScript's type system provides additional clarity, so runtime names don't need to be self-documenting to this degree.

**Alternative 3: Standardize on the Current Inconsistent Names**
- **Rejected because**: Would require changing ToolIdentifier to match the less optimal naming (`toolbox_name`, `source_server`), which moves in the wrong direction (toward more verbose, less intuitive names).

## Impact Analysis

### Code Changes Required

**Files to Modify**:
1. `src/types.ts` - Update ToolInfo interface fields
2. `src/index.ts` - Update meta-tool parameter schema and tool descriptions
3. `src/client-manager.ts` - Update tool metadata building logic
4. `README.md` - Update all examples showing parameters and tool metadata
5. `CLAUDE.md` - Update type system documentation and tool naming sections
6. `.specify/memory/constitution.md` - Amend Principle II to use standardized names

**Estimated Lines Changed**: ~50-75 lines across 6 files

### Breaking Change Analysis

**What Breaks**:
- Any MCP client calling `open_toolbox` with `toolbox_name` parameter
- Any code parsing ToolInfo objects expecting `source_server` or `toolbox_name` fields
- Documentation examples and code comments referencing old names

**Migration Path** (for post-1.0.0, not required during incubation):
- Parameter rename: `toolbox_name` → `toolbox`
- Field rename: `source_server` → `server`, `toolbox_name` → `toolbox`
- No functional changes, only naming changes

**Incubation Status**: Since the project is pre-1.0.0 (currently v0.11.1), this breaking change is acceptable per the Incubation Stage Policy (Constitution Principle VII). No migration guide is required during incubation.

### Testing Strategy

**Manual Testing**:
1. Start workbench server with test configuration
2. Call `open_toolbox` with new parameter name (`toolbox`)
3. Verify returned tool metadata uses new field names (`server`, `toolbox`)
4. Call `use_tool` to ensure delegation still works correctly
5. Verify error messages use standardized names

**Validation**:
- TypeScript compilation must pass (catches most issues)
- Search codebase for old names (`toolbox_name`, `source_server`) to ensure completeness
- Verify documentation examples are updated

## Constitution Amendment Required

### Current State (v1.8.0)

Principle II states:
> Tool metadata MUST include separate `toolbox_name`, `source_server`, and `name` fields

### Proposed Amendment (v1.9.0)

Principle II should state:
> Tool metadata MUST include separate `toolbox`, `server`, and `tool` fields

**Amendment Justification**: This corrects an inconsistency between the constitution and the ToolIdentifier structure introduced in v0.11.0 (structured tool naming). The amendment aligns all naming with a single, clear convention.

**Version Bump**: Constitution v1.8.0 → v1.9.0 (MINOR - new guidance within existing principle)

## Best Practices for Naming Conventions

### General Principles Applied

1. **Terseness vs Clarity Balance**: Choose the shortest name that is still unambiguous in context
2. **Consistency Over Perfection**: Once a naming pattern is established, apply it uniformly
3. **Avoid Redundant Prefixes/Suffixes**: If the context makes the meaning clear, omit decorative words
4. **Single Source of Truth**: Use one name per concept, not multiple synonyms

### TypeScript-Specific Considerations

- **Type System Provides Context**: Field names can be shorter because TypeScript types document their purpose
- **IDE Support**: Modern IDEs show type information on hover, reducing the need for self-documenting names
- **Refactoring Safety**: TypeScript's type checking catches most breaking changes from renames

## Conclusion

Standardizing on `toolbox`, `server`, and `tool` improves API usability, reduces cognitive load, and aligns all naming with the existing ToolIdentifier structure. The change is straightforward to implement (6 files, ~50-75 lines), introduces no functional changes, and is acceptable as a breaking change during the incubation phase. A constitution amendment (v1.8.0 → v1.9.0) is required to document the new standard.
