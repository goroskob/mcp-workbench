# Quickstart: Align Tool Identifier Property with MCP SDK Naming

**Feature**: 009-align-tool-identifier-name
**Date**: 2025-10-28
**Audience**: Developers implementing this feature

## Overview

This guide provides step-by-step instructions for implementing the tool identifier property rename from `tool` to `name` to align with MCP SDK naming conventions.

## Prerequisites

- Feature branch `009-align-tool-identifier-name` checked out
- Node.js 18+ installed
- Dependencies installed (`npm install`)
- Familiarity with the codebase structure

## Implementation Steps

### Step 1: Update ToolIdentifierSchema

**File**: `src/index.ts` (around line 35)

**Change**:
```typescript
// Before
const ToolIdentifierSchema = z
  .object({
    toolbox: z.string().min(1, "Toolbox name cannot be empty"),
    server: z.string().min(1, "Server name cannot be empty"),
    tool: z.string().min(1, "Tool name cannot be empty"),
  })
  .strict();

// After
const ToolIdentifierSchema = z
  .object({
    toolbox: z.string().min(1, "Toolbox name cannot be empty"),
    server: z.string().min(1, "Server name cannot be empty"),
    name: z.string().min(1, "Tool name cannot be empty"),
  })
  .strict();
```

**Validation**: TypeScript compilation will fail if you miss any usages.

### Step 2: Update use_tool Handler - Extract Fields

**File**: `src/index.ts` (around line 338)

**Change**:
```typescript
// Before
const { toolbox, server, tool } = params.tool;

// After
const { toolbox, server, name } = params.tool;
```

### Step 3: Update use_tool Handler - Find Tool

**File**: `src/index.ts` (around lines 341-345)

**Change**:
```typescript
// Before
const { connection, tool: foundTool } = this.clientManager.findToolInToolbox(
  toolbox,
  server,
  tool
);

// After
const { connection, tool: foundTool } = this.clientManager.findToolInToolbox(
  toolbox,
  server,
  name
);
```

**Note**: The parameter name changes from `tool` to `name`, but the return value destructuring `tool: foundTool` stays the same (it's renaming the returned value for local use).

### Step 4: Update use_tool Handler - Delegate to Downstream

**File**: `src/index.ts` (around line 349)

**Change**:
```typescript
// Before
const result = await connection.client.callTool({
  name: tool,
  arguments: params.arguments,
});

// After
const result = await connection.client.callTool({
  name: name,
  arguments: params.arguments,
});
```

**Alternative (cleaner)**:
```typescript
const result = await connection.client.callTool({
  name,  // Shorthand property
  arguments: params.arguments,
});
```

### Step 5: Update Error Message

**File**: `src/index.ts` (around line 359)

**Change**:
```typescript
// Before
text: `Error executing tool '${params.tool.tool}' in server '${params.tool.server}' (toolbox '${params.tool.toolbox}'): ${
  error instanceof Error ? error.message : String(error)
}`,

// After
text: `Error executing tool '${params.tool.name}' in server '${params.tool.server}' (toolbox '${params.tool.toolbox}'): ${
  error instanceof Error ? error.message : String(error)
}`,
```

### Step 6: Update use_tool Documentation

**File**: `src/index.ts` (around lines 273-306)

**Update these sections**:

1. **Line 276**: "How it works" description
   ```typescript
   // Before
   How it works:
   1. Specify the tool using a structured identifier: { toolbox, server, tool }

   // After
   How it works:
   1. Specify the tool using a structured identifier: { toolbox, server, name }
   ```

2. **Line 285**: Args description
   ```typescript
   // Before
   - tool: Name of the tool from the downstream server (string, non-empty)

   // After
   - name: Name of the tool from the downstream server (string, non-empty)
   ```

3. **Line 296**: Example
   ```typescript
   // Before
   Example:
     {
       "tool": {
         "toolbox": "dev",
         "server": "filesystem",
         "tool": "read_file"
       },
       "arguments": { "path": "/etc/hosts" }
     }

   // After
   Example:
     {
       "tool": {
         "toolbox": "dev",
         "server": "filesystem",
         "name": "read_file"
       },
       "arguments": { "path": "/etc/hosts" }
     }
   ```

### Step 7: Verify TypeScript Compilation

**Command**:
```bash
npm run build
```

**Expected Result**: Clean compilation with no errors. If you see errors like "Property 'tool' does not exist", you've missed an update location.

### Step 8: Search for Remaining References

**Command**:
```bash
grep -r "params\.tool\.tool" src/
grep -r "{ toolbox, server, tool }" src/
```

**Expected Result**: Zero matches after all updates are complete.

### Step 9: Update Documentation

#### README.md

**Find and update**:
- Examples showing structured tool identifier format
- Any references to the tool identifier structure

**Search command**:
```bash
grep -n "{ toolbox, server, tool }" README.md
```

#### CLAUDE.md

**Find and update**:
- Type system documentation
- Examples in "Tool Identification (Structured Format)" section
- Any references to structured identifier format

**Search command**:
```bash
grep -n "tool.*string.*tool name" CLAUDE.md
grep -n "{ toolbox, server, tool }" CLAUDE.md
```

### Step 10: Update Constitution

**File**: `.specify/memory/constitution.md`

**Section**: Principle II: Tool Naming and Conflict Resolution (around lines 48-58)

**Changes**:
1. Update the structured identifier format description
2. Update examples from `{ toolbox, server, tool }` to `{ toolbox, server, name }`
3. Update version number to 1.10.0
4. Update Sync Impact Report at the top

**Example updates**:
```markdown
// Before
- Tool identification MUST use structured format: `{ toolbox: string, server: string, tool: string }`

// After
- Tool identification MUST use structured format: `{ toolbox: string, server: string, name: string }`
```

```markdown
// Before
- Toolbox "dev", server "filesystem", tool "read_file" → `{ toolbox: "dev", server: "filesystem", tool: "read_file" }`

// After
- Toolbox "dev", server "filesystem", tool "read_file" → `{ toolbox: "dev", server: "filesystem", name: "read_file" }`
```

### Step 11: Update Agent Context

**Command**:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Purpose**: Updates the CLAUDE.md Active Technologies section with the latest changes from this feature.

**Verification**: Check that CLAUDE.md now reflects the updated naming convention.

### Step 12: Clean Build and Test

**Commands**:
```bash
npm run clean
npm run build
npm start
```

**Manual Test** (in another terminal):
1. Set up test configuration with a simple MCP server
2. Test `use_tool` with new `name` property
3. Test `use_tool` with old `tool` property (should fail with clear error)
4. Verify error messages reference `name` correctly

### Step 13: Validation Checklist

- [ ] TypeScript compilation succeeds with no errors
- [ ] No occurrences of `params.tool.tool` in src/
- [ ] No occurrences of `{ toolbox, server, tool }` in structured identifier contexts (src/, docs)
- [ ] All inline documentation updated
- [ ] README.md examples updated
- [ ] CLAUDE.md examples updated
- [ ] Constitution Principle II updated with version bump
- [ ] Manual testing with actual tool invocation passes
- [ ] Error messages reference `name` instead of `tool`

## Testing

### Manual Test Script

```bash
# Terminal 1: Start workbench
export WORKBENCH_CONFIG=./workbench-config.test.json
npm start

# Terminal 2: Test with MCP client
# Use inspector or custom client to invoke use_tool with new structure:
{
  "method": "tools/call",
  "params": {
    "name": "use_tool",
    "arguments": {
      "tool": {
        "toolbox": "test",
        "server": "memory",
        "name": "store"
      },
      "arguments": {
        "key": "test",
        "value": "hello"
      }
    }
  }
}
```

### Expected Behaviors

1. **Valid request with `name`**: Should succeed
2. **Invalid request with `tool`**: Should fail with clear Zod validation error
3. **Empty `name` field**: Should fail with "Tool name cannot be empty"
4. **Error scenario**: Error message should reference the `name` value

## Common Issues

### Issue 1: TypeScript Error "Property 'tool' does not exist"

**Cause**: Missed updating a location that accesses `params.tool.tool`

**Fix**: Search for all occurrences and update to `params.tool.name`

### Issue 2: Zod Validation Error "Unrecognized key(s) in object: 'tool'"

**Cause**: Testing with old property name after schema update

**Fix**: Update test payload to use `name` instead of `tool`

### Issue 3: Error Message Still Shows 'tool'

**Cause**: Missed updating error message template string

**Fix**: Update line 359 in src/index.ts to use `params.tool.name`

## Completion Criteria

- All validation checklist items checked off
- TypeScript compilation succeeds
- Manual testing passes
- Documentation fully updated
- Constitution amended with version bump
- Ready for `/speckit.tasks` command to generate implementation tasks

## Next Steps

After completing these implementation steps:

1. Run `/speckit.tasks` to generate task breakdown
2. Execute tasks using `/speckit.implement`
3. Create commit with breaking change notation
4. Update CHANGELOG.md (during release)
5. Bump version to 0.13.0 (minor version for breaking change during incubation)

## References

- Feature specification: [spec.md](./spec.md)
- Research decisions: [research.md](./research.md)
- Data model: [data-model.md](./data-model.md)
- API contracts: [contracts/meta-tools.md](./contracts/meta-tools.md)
