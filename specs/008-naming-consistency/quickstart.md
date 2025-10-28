# Quickstart: Standardize Parameter and Field Naming

**Feature**: 008-naming-consistency
**Date**: 2025-10-28
**Estimated Time**: 2-3 hours

## Overview

This quickstart guide walks through implementing the naming standardization refactoring. The changes are straightforward: rename parameters and fields to use `toolbox`, `server`, and `tool` consistently across the codebase.

---

## Prerequisites

- Node.js 18+ installed
- Familiarity with TypeScript type systems
- Understanding of MCP Workbench architecture (meta-server pattern)
- Git working directory clean (all changes committed)

---

## Implementation Steps

### Step 1: Update Type Definitions (15 minutes)

**File**: `src/types.ts`

1. Find the `ToolInfo` interface
2. Rename fields:
   - `source_server: string` → `server: string`
   - `toolbox_name: string` → `toolbox: string`
3. Update JSDoc comments to reference new field names

**Expected Result**:
```typescript
export interface ToolInfo extends Tool {
  /** Name of the MCP server that provides this tool */
  server: string;  // ✓ Updated
  /** Name of the toolbox this tool belongs to */
  toolbox: string;  // ✓ Updated
}
```

**Verification**: Run `npm run build` - should compile without errors.

---

### Step 2: Update Meta-Tool Parameters (20 minutes)

**File**: `src/index.ts`

1. Find the `open_toolbox` Zod schema definition
2. Rename the parameter:
   - `toolbox_name: z.string()` → `toolbox: z.string()`
3. Update all usages of `params.toolbox_name` → `params.toolbox`
4. Update tool description text to reference `toolbox` parameter
5. Update error messages to use "toolbox" (not "toolbox name")

**Search & Replace**:
- Search: `params.toolbox_name`
- Replace: `params.toolbox`
- Files: `src/index.ts`

**Expected Changes**:
- Schema: `toolbox_name: z.string()` → `toolbox: z.string()`
- Usages: `params.toolbox_name` → `params.toolbox` (3-4 occurrences)
- Description: Update text referencing parameter name

**Verification**: Run `npm run build` - should compile without errors.

---

### Step 3: Update Tool Metadata Building (15 minutes)

**File**: `src/client-manager.ts`

1. Find the `getToolsFromConnections` method (or wherever ToolInfo objects are created)
2. Update the field names in the object literal:
   - `source_server: serverName` → `server: serverName`
   - `toolbox_name: toolboxName` → `toolbox: toolboxName`
3. Update any JSDoc comments referencing these fields

**Expected Result**:
```typescript
const toolInfo: ToolInfo = {
  ...sdkTool,
  server: serverName,     // ✓ Updated
  toolbox: toolboxName    // ✓ Updated
};
```

**Verification**: Run `npm run build` - should compile without errors.

---

### Step 4: Update Documentation Examples (30 minutes)

**Files**: `README.md`, `CLAUDE.md`

1. **README.md**:
   - Find all code examples calling `open_toolbox`
   - Update parameter: `toolbox_name` → `toolbox`
   - Find all examples showing tool metadata
   - Update field names: `source_server` → `server`, `toolbox_name` → `toolbox`

2. **CLAUDE.md**:
   - Update "Tool Naming and Conflict Resolution" section
   - Update type system documentation showing ToolInfo interface
   - Update all code examples and architecture descriptions
   - Update "Key Design Patterns" section if it references field names

**Search Terms**:
- `toolbox_name`
- `source_server`
- `ToolInfo` (to find examples showing the type)

**Verification**: Manually review all changes to ensure examples are accurate and consistent.

---

### Step 5: Amend Constitution (20 minutes)

**File**: `.specify/memory/constitution.md`

1. Update Sync Impact Report at the top:
   - Increment version: 1.8.0 → 1.9.0
   - Add entry to "Modified Principles": "II. Tool Naming and Conflict Resolution"
   - Add description of the change
   - Update "Last Amended" date

2. Find Principle II: "Tool Naming and Conflict Resolution"

3. Update the field names in the principle text:
   - "Tool metadata MUST include separate `toolbox_name`, `source_server`, and `name` fields"
   - → "Tool metadata MUST include separate `toolbox`, `server`, and `tool` fields"

4. Update all examples in Principle II to use new field names

5. Update the version footer:
   - `**Version**: 1.8.0` → `**Version**: 1.9.0`
   - Update "Last Amended" date to 2025-10-28

**Verification**: Read through the amended constitution to ensure consistency.

---

### Step 6: Build and Test (30 minutes)

1. **Clean Build**:
   ```bash
   npm run clean
   npm run build
   ```

2. **Search for Old Names**:
   ```bash
   # Should find ZERO results in src/ directory:
   grep -r "toolbox_name" src/
   grep -r "source_server" src/

   # Should find ZERO results in documentation:
   grep -r "toolbox_name" README.md CLAUDE.md
   grep -r "source_server" README.md CLAUDE.md
   ```

3. **Manual Testing**:
   ```bash
   # Start server with test config:
   export WORKBENCH_CONFIG=./workbench-config.test.json
   npm start

   # In another terminal, use MCP inspector or test client:
   # 1. Call open_toolbox with {"toolbox": "test"}
   # 2. Verify response shows "server" and "toolbox" fields
   # 3. Call use_tool to ensure delegation still works
   ```

4. **TypeScript Validation**:
   - Run `npm run build` one more time
   - Verify no TypeScript errors
   - Check that `dist/` contains compiled output

**Expected Results**:
- ✅ No grep results for old field names in source/docs
- ✅ Clean TypeScript compilation
- ✅ Server starts without errors
- ✅ Meta-tools work with new parameter names

---

## Commit and Document

### Create Commit

```bash
git add .
git commit -m "feat!: standardize parameter and field naming to toolbox/server/tool

BREAKING CHANGE: Renamed inconsistent parameter and field names

- open_toolbox parameter: toolbox_name → toolbox
- ToolInfo fields: source_server → server, toolbox_name → toolbox
- Updated all documentation examples
- Amended constitution v1.8.0 → v1.9.0 (Principle II)

This change improves API consistency and reduces developer cognitive load.
During incubation, no migration guide provided per relaxed semver policy."
```

### Update CHANGELOG.md

Add entry for the breaking change:
```markdown
## [0.12.0] - 2025-10-28

### BREAKING CHANGES

- **Standardized naming**: Renamed `open_toolbox` parameter from `toolbox_name` to `toolbox`
- **Tool metadata fields**: Renamed `source_server` to `server` and `toolbox_name` to `toolbox` in ToolInfo
- Constitution updated to v1.9.0 with standardized field names in Principle II

### Changed

- All type definitions now use consistent field names (`toolbox`, `server`, `tool`)
- Updated README.md and CLAUDE.md examples to reflect new naming
- Error messages now use standardized terminology
```

---

## Troubleshooting

### TypeScript Compilation Errors

**Symptom**: `Property 'toolbox_name' does not exist on type 'ToolInfo'`

**Solution**: You missed an occurrence of the old field name. Use TypeScript's error locations to find and update all references.

```bash
# Search for any remaining old names:
grep -rn "toolbox_name" src/
grep -rn "source_server" src/
```

### Runtime Parameter Validation Errors

**Symptom**: `Invalid value for 'toolbox_name'` error when calling `open_toolbox`

**Solution**: The Zod schema wasn't updated. Check `src/index.ts` and ensure the schema uses `toolbox: z.string()`.

### Tests Failing

**Symptom**: Manual tests show old field names in responses

**Solution**: The `client-manager.ts` file wasn't updated. Verify the ToolInfo object construction uses new field names.

---

## Rollback Plan

If issues arise during testing:

```bash
# Discard all changes:
git reset --hard HEAD

# Or if committed:
git revert HEAD
```

Since this is a breaking change, once released, clients will need to update immediately. No backward compatibility is provided during incubation.

---

## Next Steps

After completing this feature:

1. **Version Bump**: Update `package.json` version (0.11.1 → 0.12.0)
2. **Create PR**: Open pull request against `main` branch
3. **Code Review**: Ensure all constitution principles are satisfied
4. **Merge**: Merge to `main` after approval
5. **Tag**: Create version tag `v0.12.0` from `main`
6. **Release**: Push tag to trigger automated release workflow

---

## Summary

**Total Time**: ~2-3 hours
**Files Modified**: 6
- `src/types.ts` (1 interface)
- `src/index.ts` (parameter schema + usages)
- `src/client-manager.ts` (metadata building)
- `README.md` (examples)
- `CLAUDE.md` (architecture docs)
- `.specify/memory/constitution.md` (Principle II amendment)

**Lines Changed**: ~50-75 (excluding documentation)

**Breaking**: Yes (parameter and field renames)

**Risk**: Low (purely naming changes, no functional modifications)
