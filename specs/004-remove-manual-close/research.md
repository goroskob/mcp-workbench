# Research: Remove Manual Toolbox Closing

**Feature**: 004-remove-manual-close
**Date**: 2025-10-28
**Status**: Complete

## Research Questions

### Q1: Current Implementation of workbench_close_toolbox

**Question**: How is `workbench_close_toolbox` currently implemented in both dynamic and proxy modes?

**Research Approach**: Examine [src/index.ts](../../src/index.ts) and [src/client-manager.ts](../../src/client-manager.ts)

**Findings**:

From [src/index.ts](../../src/index.ts):
- The `close_toolbox` tool is registered in the `registerTools()` method
- It calls `this.clientManager.closeToolbox(toolboxName)` when invoked
- In dynamic mode, it sends a `tool list changed` notification after closing
- The tool is registered conditionally based on `toolMode` configuration

From [src/client-manager.ts](../../src/client-manager.ts):
- `closeToolbox()` method handles disconnection from all MCP servers in a toolbox
- In dynamic mode, it also calls `unregisterToolsFromServer()` to remove registered tools
- Connection cleanup involves calling `client.close()` and `transport.close()`
- The `openedToolboxes` map entry is deleted after cleanup

**Decision**: Remove the entire `close_toolbox` tool registration and its handler. The cleanup logic in `ClientManager.closeToolbox()` will be repurposed for server shutdown instead of on-demand toolbox closing.

**Rationale**: The existing cleanup code is well-structured and can be reused in the shutdown handler. No new cleanup patterns needed.

---

### Q2: Signal Handler Implementation

**Question**: How are SIGINT/SIGTERM signals currently handled, and how should toolbox cleanup be integrated?

**Research Approach**: Examine [src/index.ts](../../src/index.ts) for existing signal handlers

**Findings**:

From [src/index.ts](../../src/index.ts):
- Signal handlers for SIGINT and SIGTERM are already registered in the `start()` method
- Current implementation calls `process.exit(0)` directly
- No toolbox cleanup is performed before exit

**Decision**: Enhance existing signal handlers to:
1. Call a new `ClientManager.closeAllToolboxes()` method before exit
2. Iterate through all open toolboxes and close their connections
3. Ensure cleanup completes within a reasonable timeout (5 seconds per success criteria)
4. Then call `process.exit(0)`

**Rationale**: Reusing existing signal handler infrastructure is simpler than creating new cleanup mechanisms. The 5-second timeout ensures graceful shutdown doesn't hang indefinitely.

**Alternatives Considered**:
- **process.on('beforeExit')**: Rejected because it doesn't fire for SIGINT/SIGTERM
- **Separate cleanup service**: Rejected as overly complex for this simple use case

---

### Q3: Idempotent Open Operations

**Question**: What behavior should occur when `open_toolbox` is called on an already-open toolbox?

**Research Approach**: Examine current `openToolbox()` implementation and identify what changes are needed

**Findings**:

From [src/client-manager.ts](../../src/client-manager.ts):
- Current `openToolbox()` method doesn't check if toolbox is already open
- Would attempt to reconnect and re-register tools if called twice
- No guard against duplicate opens

**Decision**: Add early-return logic at the start of `openToolbox()`:
```typescript
if (this.openedToolboxes.has(toolboxName)) {
  // Already open - return existing tool info/count
  return {
    toolbox: toolboxName,
    // ... existing data from openedToolboxes map
  };
}
```

**Rationale**: Idempotent operations are safer and prevent resource waste from duplicate connections. This matches the specification requirement FR-005.

**Alternatives Considered**:
- **Return error**: Rejected because it makes the API harder to use (clients must track state)
- **Force reconnect**: Rejected because it wastes resources and could disrupt active connections

---

### Q4: Documentation Updates Required

**Question**: What specific sections of README.md and CLAUDE.md need updating?

**Research Approach**: Review both files to identify references to `workbench_close_toolbox`

**Findings**:

From [README.md](../../README.md):
- "The Workbench Meta-Tools" section lists all 3-4 tools including close_toolbox
- "Tool Invocation Modes" section references tool counts
- Any usage examples showing close operations

From [CLAUDE.md](../../CLAUDE.md):
- "The Workbench Meta-Tools" section documents close_toolbox
- "Tool Registration and Invocation Patterns" section describes close behavior
- Architecture overview mentions connection lifecycle

From [.specify/memory/constitution.md](../../.specify/memory/constitution.md):
- Principle I "Meta-Server Orchestration Pattern" specifies exact meta-tool counts
- References cleanup on toolbox close

**Decision**: Update all three files to:
1. Remove `workbench_close_toolbox` from meta-tool lists
2. Update tool counts (3→2 in dynamic, 4→3 in proxy)
3. Replace "close toolbox" workflow with "automatic cleanup on server shutdown"
4. Update constitution Principle I to reflect new simplified model

**Rationale**: Complete documentation synchronization prevents confusion and ensures README.md/CLAUDE.md match the implementation.

---

### Q5: Breaking Change Impact

**Question**: Since this is a breaking change (removing a public API), what migration guidance should be provided?

**Research Approach**: Consider user impact and migration path

**Findings**:

- Project is in incubating phase (version < 1.0.0, using relaxed semver per README.md)
- Current version is 0.7.3
- Breaking changes are acceptable in incubating phase
- Users calling `workbench_close_toolbox` will receive tool-not-found errors

**Decision**:
1. Document breaking change in CHANGELOG.md with clear migration guidance
2. Migration guidance: "Remove all calls to workbench_close_toolbox - toolboxes now remain open until server shutdown"
3. No deprecation period needed (incubating phase)
4. Version bump: Minor version bump (0.7.3 → 0.8.0) per incubating relaxed semver

**Rationale**: Incubating status allows breaking changes without major version bump. Clear migration guidance minimizes user friction.

**Alternatives Considered**:
- **Major version bump (1.0.0)**: Rejected because project not ready to exit incubation
- **Deprecation period**: Rejected because maintaining deprecated code conflicts with simplification goal

---

## Technology Stack Decisions

**No new technologies required.** This feature uses existing TypeScript/Node.js infrastructure.

**Existing Dependencies**:
- @modelcontextprotocol/sdk ^1.6.1 - No changes needed
- zod ^3.23.8 - No changes needed

---

## Best Practices Applied

### 1. Graceful Shutdown Pattern

Following Node.js best practices for signal handling:
- Catch SIGINT (Ctrl+C) and SIGTERM (kill command)
- Clean up resources before exit
- Timeout protection to prevent hanging
- Exit with appropriate status code

**Reference**: Node.js Process documentation on signal events

### 2. Idempotent Operations

Making `open_toolbox` idempotent follows REST API best practices:
- Safe to call multiple times with same parameters
- Returns consistent results
- No unintended side effects

**Reference**: REST API idempotency patterns

### 3. Documentation-Driven Development

Updating documentation synchronously with code changes:
- README.md for end users
- CLAUDE.md for developers
- Constitution for project governance

**Reference**: MCP Workbench documentation standards (constitution Principle VI)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users depend on close_toolbox | Low | Medium | Clear breaking change documentation, migration guide in CHANGELOG |
| Shutdown cleanup fails | Low | High | Timeout protection, comprehensive testing, preserve existing cleanup code |
| Resource leaks in long-running sessions | Low | Medium | Document server restart recommendations, test with multiple toolboxes |
| Documentation drift | Low | High | Make documentation updates mandatory part of PR acceptance criteria |

---

## Research Completion

All research questions resolved. No NEEDS CLARIFICATION items remain from Technical Context. Proceeding to Phase 1 (Design & Contracts).
