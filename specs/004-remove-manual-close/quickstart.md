# Quickstart: Remove Manual Toolbox Closing

**Feature**: 004-remove-manual-close
**Branch**: `004-remove-manual-close`
**Estimated Effort**: 2-3 hours

## Implementation Checklist

### Phase 1: Code Changes (1-2 hours)

- [ ] **1.1. Update [src/client-manager.ts](../../src/client-manager.ts)**
  - [ ] Add idempotent check to `openToolbox()` method (early return if already open)
  - [ ] Create new `closeAllToolboxes()` method to iterate and close all open toolboxes
  - [ ] Ensure cleanup completes within 5-second timeout

- [ ] **1.2. Update [src/index.ts](../../src/index.ts)**
  - [ ] Remove `close_toolbox` tool registration from `registerTools()` method
  - [ ] Update signal handlers (SIGINT/SIGTERM) to call `clientManager.closeAllToolboxes()` before exit
  - [ ] Remove tool list changed notification for close (only needed for open now)

### Phase 2: Documentation Updates (30-45 minutes)

- [ ] **2.1. Update [README.md](../../README.md)**
  - [ ] Update "The Workbench Meta-Tools" section (remove close_toolbox, update counts: 3→2 in dynamic, 4→3 in proxy)
  - [ ] Update "Tool Invocation Modes" section with new tool counts
  - [ ] Remove any usage examples showing close operations
  - [ ] Add note about automatic cleanup on server shutdown
  - [ ] Update workflow examples to remove close step

- [ ] **2.2. Update [CLAUDE.md](../../CLAUDE.md)**
  - [ ] Update "The Workbench Meta-Tools" section (remove close_toolbox documentation)
  - [ ] Update "Tool Registration and Invocation Patterns" section
  - [ ] Update architecture overview with new lifecycle semantics
  - [ ] Update "Request Flow" diagram if applicable

- [ ] **2.3. Update [.specify/memory/constitution.md](../../.specify/memory/constitution.md)**
  - [ ] Update Principle I "Meta-Server Orchestration Pattern"
  - [ ] Change meta-tool counts: "3 meta-tools" → "2 meta-tools" (dynamic), "4" → "3" (proxy)
  - [ ] Update cleanup semantics: "when toolboxes close" → "when server shuts down"
  - [ ] Increment constitution version (1.3.0 → 1.4.0 per MINOR change - new simplified pattern)
  - [ ] Update Sync Impact Report at top of file

### Phase 3: Testing (30 minutes)

- [ ] **3.1. Manual Testing**
  - [ ] Start workbench with test config: `WORKBENCH_CONFIG=./workbench-config.test.json npm start`
  - [ ] Call `workbench_list_toolboxes` - verify it works
  - [ ] Call `workbench_open_toolbox` - verify it works
  - [ ] Call `workbench_open_toolbox` again (same toolbox) - verify idempotent behavior
  - [ ] Try calling `workbench_close_toolbox` - verify tool-not-found error
  - [ ] Send SIGINT (Ctrl+C) - verify graceful shutdown with cleanup
  - [ ] Check for resource leaks (no hanging processes)

### Phase 4: Release Preparation (15 minutes)

- [ ] **4.1. Update Version and Changelog**
  - [ ] Update version in [package.json](../../package.json): 0.7.3 → 0.8.0
  - [ ] Add entry to CHANGELOG.md with breaking change notice
  - [ ] Include migration guidance: "Remove all calls to workbench_close_toolbox"

## Implementation Order

Execute in this sequence to minimize errors:

1. **Start with code changes** ([src/client-manager.ts](../../src/client-manager.ts), [src/index.ts](../../src/index.ts))
2. **Run manual tests** to validate functionality
3. **Update all documentation** (README, CLAUDE.md, constitution) in parallel
4. **Final review** - ensure all references to close_toolbox are removed
5. **Version bump and changelog**

## Key Code Snippets

### 1. Idempotent Open (src/client-manager.ts)

```typescript
async openToolbox(toolboxName: string): Promise<OpenToolboxResult> {
  // Early return if already open (idempotent)
  if (this.openedToolboxes.has(toolboxName)) {
    const existing = this.openedToolboxes.get(toolboxName)!;
    // Return appropriate result based on mode
    if (this.config.toolMode === 'proxy') {
      return {
        toolbox: toolboxName,
        description: toolboxConfig.description,
        servers_connected: existing.connections.size,
        tools: [...] // Return cached tool list
      };
    } else {
      return {
        toolbox: toolboxName,
        description: toolboxConfig.description,
        servers_connected: existing.connections.size,
        tools_registered: existing.registeredTools?.size || 0
      };
    }
  }

  // ... existing open logic continues
}
```

### 2. Close All Toolboxes (src/client-manager.ts)

```typescript
async closeAllToolboxes(): Promise<void> {
  const toolboxNames = Array.from(this.openedToolboxes.keys());

  for (const toolboxName of toolboxNames) {
    try {
      await this.closeToolbox(toolboxName);
    } catch (error) {
      console.error(`Error closing toolbox ${toolboxName}:`, error);
      // Continue closing other toolboxes even if one fails
    }
  }
}
```

### 3. Enhanced Signal Handlers (src/index.ts)

```typescript
// In start() method
const shutdown = async (signal: string) => {
  console.error(`\n${signal} received, shutting down gracefully...`);

  try {
    await this.clientManager.closeAllToolboxes();
    console.error('All toolboxes closed successfully');
  } catch (error) {
    console.error('Error during toolbox cleanup:', error);
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

### 4. Remove Close Tool Registration (src/index.ts)

Delete the entire `close_toolbox` tool registration block from `registerTools()`:

```typescript
// DELETE THIS:
server.registerTool({
  name: "workbench_close_toolbox",
  description: "...",
  inputSchema: { ... },
  handler: async (args) => {
    // ... close logic
  }
});
```

## Testing Scenarios

| Scenario | Expected Outcome | Validation |
|----------|------------------|------------|
| Open toolbox once | Toolbox opens, tools available | Check tool list or tool count |
| Open same toolbox twice | Second call returns immediately (idempotent) | No duplicate connections, same result |
| Call close_toolbox | Tool-not-found error | Error message indicates tool removed |
| Server shutdown (SIGINT) | All toolboxes close gracefully within 5s | No hanging processes, clean exit |
| Multiple toolboxes open | All close on shutdown | Test with 2-3 open toolboxes |

## Documentation Review Checklist

After updates, verify:

- [ ] No remaining references to `workbench_close_toolbox` in README.md
- [ ] No remaining references to `workbench_close_toolbox` in CLAUDE.md
- [ ] Tool counts updated everywhere (search for "3 meta-tools", "4 meta-tools")
- [ ] Workflow diagrams/examples updated to remove close step
- [ ] Constitution Principle I reflects new simplified model
- [ ] Breaking change clearly documented with migration guidance

## Risk Mitigation

| Risk | Prevention Strategy |
|------|---------------------|
| Incomplete cleanup on shutdown | Add timeout protection, test with multiple toolboxes |
| Documentation drift | Use global search for "close_toolbox" and "close toolbox" before committing |
| Users confused by breaking change | Prominent CHANGELOG entry, clear migration guidance |
| Idempotent logic breaks existing flow | Test both first open and subsequent opens |

## Definition of Done

- [ ] All code changes implemented and tested
- [ ] All documentation updated (README, CLAUDE.md, constitution)
- [ ] Manual testing scenarios pass
- [ ] No references to close_toolbox remain in codebase or docs
- [ ] Version bumped and CHANGELOG updated
- [ ] Breaking change documented with migration guidance
- [ ] Constitution version incremented with updated Principle I
