# Quick Start Guide: Tool Naming Format Update

**Feature**: Tool Naming Format Update
**Branch**: `002-tool-naming-format`
**Date**: 2025-10-27
**Target Version**: 0.5.0

## Overview

This guide provides a quick reference for implementing the tool naming format update from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}`.

## 5-Minute Implementation Summary

### What Changes

1. **Tool name generation** in `ClientManager.generateToolName()`: Update separator from `_` to `__`
2. **Tool name parsing** in `ClientManager.parseToolName()`: Simplify to split on `__` only
3. **Error messages**: Update to show new format in validation errors
4. **Documentation**: Update README.md, CLAUDE.md, constitution.md
5. **Version**: Bump to 0.5.0 in package.json

### Files to Modify

```
src/client-manager.ts       # Core logic changes (2 methods)
package.json                # Version bump to 0.5.0
README.md                   # Migration guide, examples
CLAUDE.md                   # Architecture docs, examples
.specify/memory/constitution.md  # Principle II update
CHANGELOG.md                # Breaking change documentation
```

## Step-by-Step Implementation

### Step 1: Update Tool Name Generation (5 minutes)

**File**: `src/client-manager.ts`
**Method**: `generateToolName()` (line ~58)

**Before**:
```typescript
private generateToolName(toolboxName: string, serverName: string, originalToolName: string): string {
  return `${toolboxName}__${serverName}_${originalToolName}`;
}
```

**After**:
```typescript
private generateToolName(toolboxName: string, serverName: string, originalToolName: string): string {
  return `${toolboxName}__${serverName}__${originalToolName}`;
}
```

**Change**: Replace single underscore with double underscore between server and tool.

### Step 2: Update Tool Name Parsing (10 minutes)

**File**: `src/client-manager.ts`
**Method**: `parseToolName()` (lines ~23-51)

**Before** (complex mixed separator logic):
```typescript
private parseToolName(registeredName: string): { toolbox: string; server: string; originalTool: string } | null {
  const parts = registeredName.split('__');
  if (parts.length !== 2) {
    return null;
  }

  const toolboxName = parts[0];
  const serverAndTool = parts[1];

  const firstUnderscoreIndex = serverAndTool.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    return null;
  }

  const serverName = serverAndTool.substring(0, firstUnderscoreIndex);
  const originalTool = serverAndTool.substring(firstUnderscoreIndex + 1);

  if (!toolboxName || !serverName || !originalTool) {
    return null;
  }

  return {
    toolbox: toolboxName,
    server: serverName,
    originalTool: originalTool
  };
}
```

**After** (simplified consistent separator logic):
```typescript
private parseToolName(registeredName: string): { toolbox: string; server: string; originalTool: string } | null {
  // Split on double underscore, limit to 3 parts
  const parts = registeredName.split('__', 3);

  // Must have exactly 3 parts
  if (parts.length !== 3) {
    return null;
  }

  const [toolbox, server, originalTool] = parts;

  // All parts must be non-empty
  if (!toolbox || !server || !originalTool) {
    return null;
  }

  return {
    toolbox,
    server,
    originalTool
  };
}
```

**Changes**:
- Use `split('__', 3)` instead of mixed separator logic
- Remove special handling for first underscore
- Simplify validation

### Step 3: Update Error Messages (5 minutes)

**File**: `src/client-manager.ts`
**Locations**: Error messages in tool handler (lines ~304-311, 320-326, 333-340, 350-361)

**Update all error messages to reference new format**:

```typescript
// Example: Invalid tool name format error
return {
  content: [
    {
      type: "text" as const,
      text: `Error: Invalid tool name format '${prefixedName}'. Expected format: {toolbox}__{server}__{tool} (note: double underscores between all components)`,
    },
  ],
  isError: true,
};
```

**Search for**: Any error message mentioning tool name format
**Replace with**: Messages showing `{toolbox}__{server}__{tool}` format

### Step 4: Update Documentation (20 minutes)

#### 4a. Update README.md

**Sections to update**:
1. **Tool Naming Convention** section:
   - Change format from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}`
   - Update all examples

2. **Add Migration Guide** section:
```markdown
## Migration Guide: v0.4.0 → v0.5.0

### Breaking Change: Tool Naming Format

The tool naming format has changed to use consistent double underscores:

| Component | Old Format (v0.4.0) | New Format (v0.5.0) |
|-----------|---------------------|---------------------|
| Filesystem read | `dev__filesystem_read_file` | `dev__filesystem__read_file` |
| Memory store | `prod__memory_store_value` | `prod__memory__store_value` |

### Migration Checklist

- [ ] Update all tool invocations to use double underscore before tool name
- [ ] Update any custom tool name parsing logic
- [ ] Test all tool calls with new format
- [ ] Update client-side documentation

### Example Update

**Before**:
```javascript
client.callTool({ name: "dev__filesystem_read_file", arguments: {...} })
```

**After**:
```javascript
client.callTool({ name: "dev__filesystem__read_file", arguments: {...} })
```
```

3. **Update all examples** throughout README with new format

#### 4b. Update CLAUDE.md

**Sections to update**:
1. **Tool Naming Convention** section (search for naming examples)
2. **Architecture Overview** (update all tool name examples)
3. **Common Modifications** → **Tool Name Conflicts** section

**Find and replace**:
- Find: `{toolbox}__{server}_{tool}`
- Replace: `{toolbox}__{server}__{tool}`

**Find and replace examples**:
- Find: `dev__filesystem_read_file`
- Replace: `dev__filesystem__read_file`

#### 4c. Update Constitution

**File**: `.specify/memory/constitution.md`
**Section**: Principle II: Tool Naming and Conflict Resolution (lines ~42-56)

**Update**:
- Line 43: Change format definition
- Line 47: Change separator description
- Lines 52-54: Update examples

**Before**:
```markdown
- Double underscore `__` MUST separate toolbox from server+tool
- Single underscore `_` MUST separate server from tool (unchanged from previous pattern)

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem_read_file`
```

**After**:
```markdown
- Double underscore `__` MUST separate all components (toolbox, server, tool)

**Examples**:
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem__read_file`
```

**Version bump**:
- Update version at bottom from 1.1.0 to 1.2.0
- Update "Last Amended" date to 2025-10-27
- Update Sync Impact Report at top with this change

#### 4d. Update CHANGELOG.md

Add new entry at top:

```markdown
## [0.5.0] - 2025-10-27

### Breaking Changes

- **Tool Naming Format**: Changed from `{toolbox}__{server}_{tool}` to `{toolbox}__{server}__{tool}` for consistent double-underscore separators between all components
  - **Migration required**: All tool invocations must be updated to use the new format
  - See README.md for detailed migration guide
  - Old format will be rejected with error message directing to documentation

### Changed

- Simplified `ClientManager.parseToolName()` to use consistent separator parsing
- Updated all error messages to reference new tool name format
- Updated all documentation with new naming convention examples

### Added

- Migration guide in README.md with before/after examples and checklist
- Improved error messages with format hints and migration guidance
```

### Step 5: Version Bump (2 minutes)

**File**: `package.json`

**Change**:
```json
{
  "version": "0.4.0"
}
```

**To**:
```json
{
  "version": "0.5.0"
}
```

## Testing Quick Guide

### Manual Test Scenarios

1. **Open a toolbox** and verify tool names use new format:
```bash
# In MCP client, call workbench_open_toolbox
# Check returned tool names match: {toolbox}__{server}__{tool}
```

2. **Call a tool** with new format:
```bash
# Should succeed:
workbench_use_tool({
  toolbox_name: "dev",
  tool_name: "dev__filesystem__read_file",
  arguments: { path: "/test.txt" }
})
```

3. **Try old format** (should fail with clear error):
```bash
# Should fail with helpful error:
workbench_use_tool({
  toolbox_name: "dev",
  tool_name: "dev__filesystem_read_file",  # Old format
  arguments: { path: "/test.txt" }
})
```

4. **Test edge cases**:
   - Tool name with underscores: `read_file` → `dev__filesystem__read_file`
   - Tool name with multiple underscores: `read_file_async` → `dev__filesystem__read_file_async`

### Test Checklist

- [ ] Build succeeds: `npm run build`
- [ ] Tools register with new format in dynamic mode
- [ ] Tools list correctly in proxy mode
- [ ] Parsing correctly extracts all three components
- [ ] Error messages show new format
- [ ] Old format is rejected with helpful error

## Rollout Plan

### Pre-Release

1. ✅ Implement code changes
2. ✅ Update all documentation
3. ✅ Manual testing with test configuration
4. ✅ Verify constitution compliance

### Release

1. Commit all changes: `git add . && git commit -m "feat!: change tool naming format to consistent double underscores (v0.5.0)"`
2. Tag release: `git tag v0.5.0`
3. Push: `git push origin 002-tool-naming-format --tags`
4. GitHub Actions will automatically:
   - Build the project
   - Create GitHub release
   - Publish to npm

### Post-Release

1. Announce breaking change in:
   - GitHub release notes
   - npm package description
   - Project README
2. Monitor for user issues
3. Update any external documentation (wikis, tutorials, etc.)

## Troubleshooting

### Build Errors

**Error**: TypeScript compilation fails
**Solution**: Run `npm run clean && npm run build`

### Test Failures

**Error**: Tool not found after format change
**Solution**: Verify both `generateToolName()` and `parseToolName()` are updated with same format

### Documentation Out of Sync

**Error**: Examples don't match actual format
**Solution**: Search all files for old format pattern and replace:
```bash
# Search for old format
grep -r "filesystem_read_file" .

# Should only appear in "old format" examples
```

## Time Estimates

| Task | Estimated Time |
|------|----------------|
| Update generateToolName() | 5 minutes |
| Update parseToolName() | 10 minutes |
| Update error messages | 5 minutes |
| Update README.md | 10 minutes |
| Update CLAUDE.md | 5 minutes |
| Update constitution.md | 5 minutes |
| Update CHANGELOG.md | 3 minutes |
| Version bump | 2 minutes |
| Testing | 10 minutes |
| **Total** | **~55 minutes** |

## Next Steps

After implementation:

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement changes following the tasks
3. Test thoroughly with `workbench-config.test.json`
4. Create pull request
5. Merge and release v0.5.0

## References

- [Feature Spec](spec.md)
- [Research Document](research.md)
- [Data Model](data-model.md)
- [API Contracts](contracts/README.md)
- [Implementation Plan](plan.md)
