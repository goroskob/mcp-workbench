# Quick Start: Initialization Instructions Implementation

**Feature**: 005-init-instructions-toolboxes
**Audience**: Developers implementing this feature
**Time**: ~2-3 hours for implementation + testing

## Prerequisites

- [x] Feature spec reviewed ([spec.md](spec.md))
- [x] Research completed ([research.md](research.md))
- [x] Data model understood ([data-model.md](data-model.md))
- [x] Contracts reviewed ([contracts/](contracts/))
- [x] Development environment set up (Node.js 18+, npm)
- [x] Working knowledge of TypeScript and MCP SDK

## Implementation Overview

This feature involves:
1. **Adding** instructions generation to initialization handler (~30 lines)
2. **Removing** `workbench_list_toolboxes` tool registration (~50 lines deleted)
3. **Updating** documentation (README.md, CLAUDE.md, constitution.md)
4. **Testing** with real MCP clients

**Estimated Complexity**: Low
**Files Modified**: 4 code files + 3 documentation files
**LOC Changes**: ~+50, ~-50 (net neutral)

## Step-by-Step Implementation

### Phase 1: Add Instructions Generation (30 min)

**File**: `src/index.ts`

**Step 1.1**: Add helper method for generating instructions

Find the `WorkbenchServer` class and add this method:

```typescript
/**
 * Generate initialization instructions listing available toolboxes
 * @returns Plain text instructions with toolbox metadata
 */
private generateToolboxInstructions(): string {
  const toolboxEntries = Object.entries(this.config.toolboxes);

  // Handle empty configuration
  if (toolboxEntries.length === 0) {
    return [
      "No toolboxes configured.",
      "",
      "To configure toolboxes, add them to your workbench-config.json file.",
      "See documentation for configuration format."
    ].join("\n");
  }

  // Generate toolbox listings
  const listings = toolboxEntries
    .map(([name, config]) => {
      const serverCount = Object.keys(config.mcpServers).length;
      const description = config.description || "No description provided";
      return `${name} (${serverCount} servers)\n  Description: ${description}`;
    })
    .join("\n\n");

  // Combine header, listings, and footer
  return [
    "Available Toolboxes:",
    "",
    listings,
    "",
    "To access tools from a toolbox, use workbench_open_toolbox with the toolbox name."
  ].join("\n");
}
```

**Step 1.2**: Modify initialization handler

Find the `initialize()` method and update the return statement:

```typescript
async initialize(params: InitializeRequestParams): Promise<InitializeResult> {
  // ... existing protocol negotiation code ...

  // Generate instructions
  const instructions = this.generateToolboxInstructions();

  return {
    protocolVersion: negotiatedVersion,
    capabilities: this.capabilities,
    serverInfo: {
      name: "mcp-workbench",
      version: packageJson.version
    },
    instructions  // NEW: Include toolbox instructions
  };
}
```

**Verification**: Build and run server, connect with MCP client, verify instructions appear in initialization response.

---

### Phase 2: Remove Legacy Tool (20 min)

**File**: `src/index.ts`

**Step 2.1**: Find `workbench_list_toolboxes` tool registration

Search for the tool registration code (likely in `registerTools()` method or similar):

```typescript
// DELETE THIS ENTIRE BLOCK
server.registerTool({
  name: "workbench_list_toolboxes",
  description: "List all configured toolboxes with their metadata",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
}, async () => {
  // ... tool handler implementation ...
});
```

**Step 2.2**: Remove tool handler logic

Delete the handler function and any helper methods only used by this tool.

**Step 2.3**: Update tool count comments

Search for comments mentioning "2 meta-tools" or "3 meta-tools" and update:
- Dynamic mode: 2 → 1
- Proxy mode: 3 → 2

**Verification**: Build and run server, verify `workbench_list_toolboxes` not in tools list.

---

### Phase 3: Update Type Definitions (10 min)

**File**: `src/types.ts` (if needed)

**Step 3.1**: Add ToolboxMetadata type (optional - only if extracting logic)

```typescript
/**
 * Metadata for a toolbox used in initialization instructions
 */
export interface ToolboxMetadata {
  name: string;
  description: string;
  serverCount: number;
}
```

**Note**: This type is optional - you may choose to keep the logic inline.

**Verification**: No runtime changes, verify TypeScript compilation passes.

---

### Phase 4: Documentation Updates (60 min)

**File**: `README.md`

**Step 4.1**: Update "The Workbench Meta-Tools" section

**Before**:
```markdown
The workbench exposes 2-3 meta-tools depending on the configured `toolMode`:

1. **workbench_list_toolboxes** - Lists configured toolboxes
2. **workbench_open_toolbox** - Connects to toolbox servers
3. **workbench_use_tool** (proxy mode only) - Executes tools
```

**After**:
```markdown
The workbench exposes 1-2 meta-tools depending on the configured `toolMode`:

1. **workbench_open_toolbox** - Connects to toolbox servers
2. **workbench_use_tool** (proxy mode only) - Executes tools

Toolbox discovery is provided via the `instructions` field in the initialization response.
```

**Step 4.2**: Add "Initialization Instructions" section

Add new section explaining the instructions field:

```markdown
### Initialization Instructions

When an MCP client connects to the workbench, the initialization response includes an `instructions` field containing a listing of all configured toolboxes:

\`\`\`
Available Toolboxes:

dev (3 servers)
  Description: Development environment tools

prod (2 servers)
  Description: Production monitoring tools

To access tools from a toolbox, use workbench_open_toolbox with the toolbox name.
\`\`\`

This allows clients to discover available toolboxes without making additional tool calls.
```

**CLARIFICATION NOTE**: ~~Step 4.3 (migration guide)~~ **REMOVED** - Silent removal approach per `/speckit.clarify` session. No migration guide needed.

---

**File**: `CLAUDE.md`

**Step 4.3**: Update "The Workbench Meta-Tools" section

Same changes as README.md Step 4.1.

**Step 4.4**: Update "Key Design Patterns" section

Add subsection explaining initialization instructions pattern:

```markdown
### Initialization Instructions Pattern

Toolbox discovery is integrated into the MCP initialization handshake:

**On Initialize**:
1. Server receives initialize request
2. Generates instructions string from configuration
3. Includes instructions in InitializeResult
4. Client receives toolbox listings immediately

**Format**:
- Plain text with structured sections
- Lists toolbox name, server count, description
- Includes usage guidance
- Handles empty configuration gracefully
```

---

**File**: `.specify/memory/constitution.md`

**Step 4.5**: Update Principle I

**Before**:
```markdown
- MUST expose exactly 2 meta-tools in dynamic mode: `workbench_list_toolboxes`, `workbench_open_toolbox`
- MUST expose exactly 3 meta-tools in proxy mode: the above two plus `workbench_use_tool`
```

**After**:
```markdown
- MUST expose exactly 1 meta-tool in dynamic mode: `workbench_open_toolbox`
- MUST expose exactly 2 meta-tools in proxy mode: the above plus `workbench_use_tool`
- MUST provide toolbox discovery via initialization `instructions` field
```

**Step 4.6**: Update constitution version and sync impact report

Increment version to 1.5.0 and add entry to sync impact report at top of file.

---

### Phase 5: Testing (30 min)

**Step 5.1**: Unit tests (if test framework exists)

Create tests for `generateToolboxInstructions()`:

```typescript
describe("generateToolboxInstructions", () => {
  it("handles empty configuration", () => {
    const server = new WorkbenchServer({ toolboxes: {} });
    const instructions = server.generateToolboxInstructions();
    expect(instructions).toContain("No toolboxes configured");
  });

  it("formats single toolbox correctly", () => {
    const server = new WorkbenchServer({
      toolboxes: {
        dev: {
          description: "Dev tools",
          mcpServers: { fs: { /* ... */ } }
        }
      }
    });
    const instructions = server.generateToolboxInstructions();
    expect(instructions).toContain("dev (1 servers)");
    expect(instructions).toContain("Description: Dev tools");
  });

  it("handles missing description", () => {
    const server = new WorkbenchServer({
      toolboxes: {
        test: {
          mcpServers: { mem: { /* ... */ } }
        }
      }
    });
    const instructions = server.generateToolboxInstructions();
    expect(instructions).toContain("No description provided");
  });
});
```

**Step 5.2**: Manual integration testing

1. Update `workbench-config.test.json` with 2-3 toolboxes
2. Run: `npm run build && npm start`
3. Connect with MCP client (e.g., `npx @modelcontextprotocol/inspector`)
4. Verify initialization response includes `instructions` field
5. Verify instructions format is correct
6. Verify `workbench_list_toolboxes` not in tools list
7. Test with empty configuration
8. Test with toolbox missing description

**Step 5.3**: Performance testing

Measure initialization time before/after:
```bash
# Use inspector or custom timing script
time npx @modelcontextprotocol/inspector workbench
```

Verify: <100ms increase (should be <1ms in practice)

---

### Phase 6: Version Bump and Release Prep (5 min)

**CLARIFICATION NOTE**: Per `/speckit.clarify` session, this will be a **MINOR version bump** with **silent removal** (no migration guide).

**Step 6.1**: Update package.json version

```bash
npm version minor  # 0.8.0 → 0.9.0 (minor bump per user choice)
```

**Step 6.2**: Update CHANGELOG.md

Add entry for v0.9.0:

```markdown
## [0.9.0] - 2025-10-28

### Changed

- **Removed `workbench_list_toolboxes` meta-tool**: Toolbox discovery is now provided via the `instructions` field in the MCP initialization response. ([#005](specs/005-init-instructions-toolboxes/spec.md))

### Added

- Initialization `instructions` field containing toolbox listings with names, server counts, and descriptions
- Plain text formatted toolbox discovery available immediately on connection

### Benefits

- Eliminates extra round-trip for toolbox discovery
- Follows standard MCP initialization patterns
- Simpler client implementation
```

**Step 6.3**: Verify documentation completeness

- [ ] README.md updated (remove list_toolboxes, add initialization docs)
- [ ] CLAUDE.md updated (architecture changes)
- [ ] constitution.md updated (meta-tool counts)
- [ ] CHANGELOG.md updated
- [ ] ~~Migration guide~~ NOT NEEDED (silent removal approach per clarification)
- [ ] All examples updated

---

## Validation Checklist

Before considering implementation complete:

### Functional Requirements
- [ ] FR-001: Initialize response includes `instructions` field
- [ ] FR-002: Toolbox listing includes name, description, server count
- [ ] FR-003: Instructions are human-readable plain text
- [ ] FR-004: Generated from same config as legacy tool
- [ ] FR-005: `workbench_list_toolboxes` removed from tools list
- [ ] FR-006: Edge cases handled (empty config, missing descriptions)
- [ ] FR-007: Plain text format used

### Success Criteria
- [ ] SC-001: Clients discover toolboxes without tool calls
- [ ] SC-002: Initialization time increase <100ms (measure!)
- [ ] SC-003: 100% of toolbox info available in instructions
- [ ] SC-004: Documentation sufficient for client integration

### Quality Gates
- [ ] TypeScript compiles without errors
- [ ] Manual testing passes all scenarios
- [ ] Documentation updated per constitution requirements
- [ ] Breaking change clearly documented
- [ ] Migration guide provided
- [ ] Version bumped to v1.0.0 (major)

---

## Common Issues and Solutions

### Issue: Instructions field not appearing

**Symptom**: Client doesn't receive instructions
**Solution**: Verify MCP SDK version supports `instructions` field (should be v1.0.0+), check initialization handler returns object with instructions property

### Issue: Formatting looks wrong in client

**Symptom**: Text appears as single line or poorly formatted
**Solution**: Ensure newlines are `\n` (not `\\n`), test with different clients, verify plain text (not HTML/markdown)

### Issue: Server count incorrect

**Symptom**: Numbers don't match expected values
**Solution**: Verify counting `Object.keys(config.mcpServers).length`, check for empty mcpServers objects in config

### Issue: Legacy tool still appears

**Symptom**: `workbench_list_toolboxes` still in tools list
**Solution**: Verify tool registration fully removed, clear any caches, restart server, check both dynamic and proxy mode

---

## Next Steps

After implementation complete:

1. **Create Pull Request**: `005-init-instructions-toolboxes` → `main`
2. **Code Review**: Constitution compliance check
3. **Merge to Main**: Follow release policy (merge-first workflow)
4. **Tag Release**: `git tag -a v1.0.0 -m "Release v1.0.0"`
5. **Push Tag**: `git push origin v1.0.0` (triggers GitHub Actions)
6. **Verify Release**: Check GitHub release and npm publish

---

## Support

- **Spec Questions**: See [spec.md](spec.md)
- **Technical Details**: See [data-model.md](data-model.md) and [contracts/](contracts/)
- **Constitution**: See `.specify/memory/constitution.md`
- **MCP Spec**: https://modelcontextprotocol.io/

**Estimated Total Time**: 2-3 hours for experienced developer, 4-5 hours including thorough testing
