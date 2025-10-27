# Testing Guide - Duplicate Tools Support

This guide provides comprehensive testing instructions for the duplicate tools support feature (v0.4.0).

## Quick Start

```bash
# 1. Build the project
npm run build

# 2. Run the test suite
./test-duplicate-tools.sh
```

## Test Configuration

The test configuration file [workbench-config-duplicate.json](workbench-config-duplicate.json) defines three toolboxes:

- **dev**: Development environment with memory server
- **prod**: Production environment with memory server (same as dev)
- **testing**: Testing environment with two memory servers (duplicate within same toolbox)

This configuration tests:
- ✅ Multiple toolboxes with the same server name
- ✅ Multiple servers within a single toolbox
- ✅ Tool name uniqueness with `{toolbox}__{server}_{tool}` format

## Manual Testing Scenarios

### Scenario 1: Single Toolbox (T045)

**Goal**: Verify tool naming format with single toolbox

```bash
# Start the workbench
export WORKBENCH_CONFIG=./workbench-config-duplicate.json
npm start
```

Using your MCP client:

1. Call `workbench_list_toolboxes`
   - Expected: Shows dev, prod, testing toolboxes

2. Call `workbench_open_toolbox` with `toolbox_name: "dev"`
   - Expected: Success response with `tools_registered` count

3. List available tools
   - Expected tool names: `dev__memory_create_entities`, `dev__memory_read_graph`, etc.
   - Format: All tools start with `dev__memory_`

### Scenario 2: Duplicate Servers (T046)

**Goal**: Open two toolboxes with the same server

Continuing from Scenario 1:

1. Call `workbench_open_toolbox` with `toolbox_name: "prod"`
   - Expected: Success (no conflicts with dev toolbox)

2. List available tools
   - Expected: Both `dev__memory_*` and `prod__memory_*` tools registered
   - No naming conflicts between toolboxes

### Scenario 3: Tool Routing (T047)

**Goal**: Verify tools route to correct server instance

Each memory server maintains independent state. Test this by:

1. Call `dev__memory_create_entities`:
   ```json
   {
     "entities": [
       {"name": "alice", "entityType": "user", "observations": ["dev environment"]}
     ]
   }
   ```
   - Expected: Success

2. Call `prod__memory_create_entities`:
   ```json
   {
     "entities": [
       {"name": "bob", "entityType": "user", "observations": ["prod environment"]}
     ]
   }
   ```
   - Expected: Success

3. Call `dev__memory_read_graph`
   - Expected: Returns graph with "alice" only (not "bob")

4. Call `prod__memory_read_graph`
   - Expected: Returns graph with "bob" only (not "alice")

**Success Criteria**: Each server maintains independent state, proving correct routing.

### Scenario 4: Independent Lifecycle (T048)

**Goal**: Verify closing one toolbox doesn't affect others

1. Call `workbench_close_toolbox` with `toolbox_name: "dev"`
   - Expected: Success, `dev__memory_*` tools unregistered

2. List available tools
   - Expected: Only `prod__memory_*` tools remain

3. Call `prod__memory_read_graph`
   - Expected: Still works, "bob" entity still present

### Scenario 5: Re-open Toolbox (T049)

**Goal**: Verify toolbox can be re-opened with fresh state

1. Call `workbench_open_toolbox` with `toolbox_name: "dev"`
   - Expected: Success, `dev__memory_*` tools registered again

2. Call `dev__memory_read_graph`
   - Expected: Empty graph (fresh server connection, "alice" is gone)

### Scenario 6: Scale Test (T050)

**Goal**: Verify system handles multiple toolboxes/servers

1. Open `testing` toolbox (has 2 servers: memory, memory-secondary)
   - Expected: Both `testing__memory_*` and `testing__memory-secondary_*` registered

2. Verify state:
   - Toolboxes open: dev, prod, testing (3 toolboxes)
   - Server connections: 4 (dev:memory, prod:memory, testing:memory, testing:memory-secondary)

3. Test a tool from each server to verify all work correctly

### Scenario 7: Proxy Mode (T051) - Optional

**Goal**: Test duplicate servers in proxy mode

1. Create `workbench-config-duplicate-proxy.json`:
   ```json
   {
     "toolMode": "proxy",
     "toolboxes": { /* same as workbench-config-duplicate.json */ }
   }
   ```

2. Restart server with proxy config

3. Use `workbench_use_tool` meta-tool instead of direct tool calls:
   ```json
   {
     "toolbox_name": "dev",
     "tool_name": "dev__memory_create_entities",
     "arguments": { "entities": [...] }
   }
   ```

4. Verify routing works correctly in proxy mode

### Scenario 8: Error Handling (T052)

**Goal**: Verify clear error messages for invalid requests

Test each error case:

1. **Invalid tool name format**:
   - Call tool: `invalid_name_format`
   - Expected error: Contains "Invalid tool name format"

2. **Non-existent toolbox**:
   - Call tool: `fake__memory_read_graph`
   - Expected error: Contains "Toolbox 'fake' not found"

3. **Non-existent server**:
   - Call tool: `dev__fakeserver_tool`
   - Expected error: Contains "Server 'fakeserver' not found in toolbox 'dev'"

4. **Invalid toolbox name**:
   - Call `workbench_open_toolbox` with `toolbox_name: "nonexistent"`
   - Expected error: Contains "Toolbox not found in configuration"

## Success Criteria Verification (T053)

After completing all scenarios, verify these criteria:

- [ ] **SC-001**: Multiple toolboxes with same server can be opened simultaneously
  - Verified by: Scenario 2

- [ ] **SC-002**: Tools from different toolboxes have unique names
  - Verified by: Scenarios 1, 2 (naming pattern `{toolbox}__{server}_{tool}`)

- [ ] **SC-003**: Tool invocations route to correct server instance
  - Verified by: Scenario 3 (independent memory state)

- [ ] **SC-004**: Closing one toolbox doesn't affect others
  - Verified by: Scenario 4

- [ ] **SC-005**: Tool naming follows `{toolbox}__{server}_{tool}` pattern
  - Verified by: All scenarios

- [ ] **SC-006**: System supports 5+ toolboxes with overlapping servers
  - Verified by: Scenario 6 (3 toolboxes, 4 server connections)

## Test Results Template

Copy this template to `test-results.log`:

```
Test Results - [DATE]
================================

T045: Single Toolbox
Status: [ PASS / FAIL ]
Notes:

T046: Duplicate Servers
Status: [ PASS / FAIL ]
Notes:

T047: Tool Routing
Status: [ PASS / FAIL ]
Notes:

T048: Independent Lifecycle
Status: [ PASS / FAIL ]
Notes:

T049: Re-open Toolbox
Status: [ PASS / FAIL ]
Notes:

T050: Scale Test
Status: [ PASS / FAIL ]
Notes:

T051: Proxy Mode (Optional)
Status: [ PASS / FAIL / SKIPPED ]
Notes:

T052: Error Handling
Status: [ PASS / FAIL ]
Notes:

T053: Success Criteria
SC-001: [ PASS / FAIL ]
SC-002: [ PASS / FAIL ]
SC-003: [ PASS / FAIL ]
SC-004: [ PASS / FAIL ]
SC-005: [ PASS / FAIL ]
SC-006: [ PASS / FAIL ]

Overall Status: [ PASS / FAIL ]
```

## Troubleshooting

### Build Errors
```bash
npm run clean
npm install
npm run build
```

### Server Won't Start
- Check `WORKBENCH_CONFIG` environment variable is set
- Verify config file exists and is valid JSON
- Check Node.js version (requires 18+)

### Tools Not Registered
- Verify `@modelcontextprotocol/server-memory` is installed
- Check server logs for connection errors
- Try `npx -y @modelcontextprotocol/server-memory` manually to verify it works

### Tool Routing Issues
- Verify tool name uses correct format: `{toolbox}__{server}_{tool}`
- Check both toolboxes are open
- Review error messages for missing toolbox/server

## Next Steps

After testing:

1. Mark completed tests in [specs/001-duplicate-tools-support/tasks.md](specs/001-duplicate-tools-support/tasks.md) (T044-T053)
2. Proceed to Phase 9: Polish & Constitution Amendment
3. Update version in `package.json` to `0.4.0`
4. Create release following instructions in [CLAUDE.md](CLAUDE.md)
