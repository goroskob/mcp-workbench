# Research: Tool Naming Format Update

**Feature**: Tool Naming Format Update
**Branch**: `002-tool-naming-format`
**Date**: 2025-10-27

## Overview

This document consolidates research findings for changing the tool naming format from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}` with consistent double-underscore separators.

## Research Questions

### Q1: String Parsing Strategy for Consistent Separators

**Question**: What is the optimal parsing strategy for extracting toolbox, server, and tool names from the format `{toolbox}__{server}__{tool}` when tool names may contain single underscores?

**Decision**: Split on double underscore only, limiting to first 3 components

**Rationale**:
- JavaScript's `split('__')` naturally handles this pattern
- Limiting split to 3 parts prevents fragmentation if tool names contain double underscores
- Implementation: `const [toolbox, server, tool] = name.split('__', 3)`
- This handles edge cases like `dev__filesystem__read_file_async` correctly

**Alternatives Considered**:
- **Regular expressions**: More complex, harder to maintain, no performance benefit for this use case
- **Sequential indexOf parsing**: More verbose, error-prone, harder to read
- **Split without limit**: Would fail if tool names contain `__` (e.g., `my__special__tool`)

**Implementation Notes**:
```typescript
// Current (mixed separators):
parseToolName(name: string) {
  const parts = name.split('__');  // Split toolbox from server+tool
  const [serverName, ...toolParts] = parts[1].split('_');  // Mixed logic
  return { toolbox: parts[0], server: serverName, tool: toolParts.join('_') };
}

// New (consistent separators):
parseToolName(name: string) {
  const parts = name.split('__', 3);  // Limit to 3 parts
  if (parts.length !== 3) return null;  // Invalid format
  return { toolbox: parts[0], server: parts[1], tool: parts[2] };
}
```

### Q2: Version Bumping Strategy for Incompatible Changes

**Question**: Should this be released as 1.0.0 (first stable) or as the next major version increment?

**Decision**: Release as 0.5.0 (MINOR version from 0.4.0) despite incompatible nature

**Rationale**:
- Per maintainer decision: minor bump despite incompatible change (non-standard semver)
- Explicitly documented deviation from semantic versioning in spec (OOS-005)
- Maintains 0.x versioning to signal project is not yet at 1.0 maturity
- Clear documentation and migration guide will compensate for non-standard versioning
- Aligns with project maintainer's release strategy preferences

**Alternatives Considered**:
- **Major bump to 1.0.0**: Would follow strict semver but deemed premature for 1.0 milestone
- **Minor with backward compatibility**: Rejected - no dual support desired per clarification
- **Delay until other features ready for 1.0**: Delays addressing known inconsistency

**npm Publishing Notes**:
- Update `package.json` version to 0.5.0
- GitHub Actions will automatically publish to npm on tag push
- CHANGELOG.md must clearly mark this as an incompatible change despite minor bump
- Documentation must warn users about the non-standard versioning approach

### Q3: Documentation Migration Guide Structure

**Question**: What information should be included in the migration guide for users upgrading from the old format?

**Decision**: Include before/after examples, migration checklist, and troubleshooting section

**Rationale**:
- Users need clear examples showing the exact change
- Step-by-step checklist reduces migration errors
- Troubleshooting section addresses common errors during transition
- Links to updated documentation for reference

**Alternatives Considered**:
- **Minimal changelog entry only**: Insufficient for breaking changes affecting all users
- **Automated migration script**: Out of scope per spec (OOS-001), and client-side tool names vary
- **Deprecation period with dual support**: Rejected per clarification (atomic breaking change)

**Migration Guide Structure**:
```markdown
## Migration Guide: Tool Naming Format Update (v1.0.0)

### What Changed
- Old format: `{toolbox}__{server}_{tool}` (mixed separators)
- New format: `{toolbox}__{server}__{tool}` (consistent double underscores)

### Examples
| Component | Old Format | New Format |
|-----------|------------|------------|
| Filesystem read | `dev__filesystem_read_file` | `dev__filesystem__read_file` |
| Memory store | `prod__memory_store_value` | `prod__memory__store_value` |

### Migration Checklist
- [ ] Update all tool invocations to use new format
- [ ] Update any tool name parsing logic in client code
- [ ] Test tool calls with new naming convention
- [ ] Update documentation/examples in your codebase

### Troubleshooting
**Error**: "Tool 'dev__filesystem_read_file' not found"
**Solution**: Update to new format `dev__filesystem__read_file` (double underscore before tool name)
```

### Q4: Testing Strategy for Naming Format Changes

**Question**: How should we validate that the naming format change works correctly across all scenarios?

**Decision**: Manual testing with real MCP servers covering both dynamic and proxy modes

**Rationale**:
- Existing testing approach uses real downstream servers (per constitution)
- Must validate both modes (dynamic and proxy) produce identical naming
- Edge cases (tool names with underscores, double underscores) require explicit testing
- Parsing logic needs validation for error cases

**Alternatives Considered**:
- **Unit tests with mocks**: Would not catch integration issues with real MCP SDK
- **Automated E2E tests**: Infrastructure not yet in place, out of scope for this feature
- **Property-based testing**: Overkill for straightforward string manipulation

**Test Scenarios** (to be added to TESTING.md):
1. **Basic naming**: Verify `{toolbox}__{server}__{tool}` format in both modes
2. **Tool names with underscores**: Verify `read_file` → `dev__filesystem__read_file`
3. **Multiple underscores in tool name**: Verify `read_file_async` parsing
4. **Tool name with double underscores**: Verify edge case handling
5. **Parsing validation**: Test invalid formats return clear errors
6. **Mode parity**: Confirm dynamic and proxy mode produce identical names

### Q5: Error Message Design for Invalid Tool Names

**Question**: What error messages should be shown when tool names don't match the new format?

**Decision**: Contextual error messages with expected format and migration guidance

**Rationale**:
- Users need to understand what went wrong and how to fix it
- Error messages should guide toward the migration documentation
- Include expected format to reduce back-and-forth debugging

**Alternatives Considered**:
- **Generic "invalid format" error**: Unhelpful for users during migration
- **Automatic format correction**: Could hide bugs in client code
- **Silent fallback to old format**: Violates atomic breaking change decision

**Error Message Examples**:
```typescript
// Invalid format
`Error: Invalid tool name format '${name}'. Expected format: {toolbox}__{server}__{tool} (note: double underscores between all components)`

// Tool not found with helpful context
`Tool '${oldFormat}' not found. Did you mean '${newFormat}'? See migration guide: [link]`

// Parsing failure
`Error: Failed to parse tool name '${name}'. Tool names must follow format {toolbox}__{server}__{tool}`
```

## Summary of Decisions

| Area | Decision | Impact |
|------|----------|--------|
| Parsing strategy | Split on `__` with limit of 3 parts | Simplified parsing logic, handles edge cases |
| Version bump | Release as 1.0.0 | Signals first stable release with breaking change |
| Migration guide | Comprehensive guide with examples and troubleshooting | Reduces support burden, clearer user experience |
| Testing approach | Manual testing with real MCP servers | Validates integration with MCP SDK, covers both modes |
| Error messages | Contextual with expected format and migration links | Better user experience during migration |

## Implementation Priorities

1. **Update parsing logic** in `ClientManager.parseToolName()` and `generateToolName()`
2. **Update error messages** throughout error handling code
3. **Create migration guide** in README.md
4. **Update documentation** (README.md, CLAUDE.md, constitution)
5. **Update version** to 1.0.0 in package.json
6. **Add test scenarios** to TESTING.md

## References

- Feature spec: [spec.md](spec.md)
- Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)
- Current implementation: [src/client-manager.ts](../../src/client-manager.ts)
- Semantic Versioning: https://semver.org/
