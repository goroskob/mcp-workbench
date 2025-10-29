# Test Scenarios Specification

**Purpose**: Define test scenarios mapped to user stories
**Type**: Test Specification Contract

## User Story 1: Complete Workbench Workflow Validation (P1)

File: `e2e/scenarios/workflow-validation.e2e.ts`

### Test 1.1: Server Initialization and Connection

**Purpose**: Validate workbench accepts connections and returns initialization instructions

**Given**: Workbench configuration with valid downstream servers
**When**: E2E test starts server and connects as MCP client
**Then**: Server accepts connection and returns toolbox listings in initialization response

**Test Steps**:
1. Allocate port for test isolation
2. Start workbench server with `valid-single-toolbox` config
3. Create MCP client and connect
4. Assert initialization response includes toolbox instructions
5. Assert toolbox list contains "test" toolbox
6. Disconnect client
7. Stop server

**Assertions**:
- Server starts within 10 seconds
- Client connects successfully
- Initialization response includes `instructions` field
- Toolbox "test" appears in instructions

---

### Test 1.2: Open Toolbox and Retrieve Tools

**Purpose**: Validate `open_toolbox` meta-tool returns full tool list with schemas

**Given**: MCP client connected to workbench
**When**: Test calls `open_toolbox` with valid toolbox name
**Then**: Toolbox opens and returns full list of tools with schemas

**Test Steps**:
1. Connect to running workbench
2. Call `open_toolbox` with name "test"
3. Assert response contains array of tools
4. Assert tools have required fields (toolbox, server, name, inputSchema)
5. Assert tool count matches expected (from memory server)

**Assertions**:
- `open_toolbox` succeeds
- Tool list is non-empty array
- Each tool has structured identifier fields
- Tool schemas match expected definitions

---

### Test 1.3: Execute Tool via use_tool

**Purpose**: Validate `use_tool` executes and returns result from downstream server

**Given**: Toolbox is open
**When**: Test calls `use_tool` with valid structured identifier and arguments
**Then**: Tool executes and returns expected result

**Test Steps**:
1. Open "test" toolbox
2. Call `use_tool` with identifier `{ toolbox: 'test', server: 'memory', name: 'store_value' }`
3. Pass arguments `{ key: 'test-key', value: 'test-value' }`
4. Assert result indicates success
5. Verify value was stored (call retrieve tool)

**Assertions**:
- `use_tool` succeeds
- Result matches expected structure
- Downstream server received and processed request

---

### Test 1.4: Proper Connection Cleanup

**Purpose**: Validate connections clean up properly between tests

**Given**: Multiple E2E tests run sequentially
**When**: Each test completes
**Then**: Server connections properly cleaned up, subsequent tests start fresh

**Test Steps**:
1. Run test with server startup and client connection
2. Disconnect client
3. Stop server
4. Immediately start new test
5. Assert new test starts successfully without port conflicts

**Assertions**:
- Cleanup completes without errors
- No lingering processes
- Ports are released
- New test can use same port

---

### Test 1.5: Full Workflow Integration

**Purpose**: Validate complete end-to-end workflow

**Given**: Fresh workbench instance
**When**: Complete workflow executed (init → open → use → cleanup)
**Then**: All steps complete with pass/fail status

**Test Steps**:
1. Start server
2. Connect client
3. Verify initialization
4. Open toolbox
5. List tools
6. Execute multiple tools
7. Disconnect
8. Stop server

**Assertions**:
- All workflow steps pass
- No errors in any phase
- Pass/fail status reported (per clarifications)

---

## User Story 2: Configuration Validation Testing (P2)

File: `e2e/scenarios/configuration.e2e.ts`

### Test 2.1: Environment Variable Expansion

**Purpose**: Validate environment variables expand correctly in configuration

**Given**: Configuration with `${VAR}` and `${VAR:-default}` patterns
**When**: E2E tests run with environment variables set
**Then**: Workbench correctly expands variables and connects to servers

**Test Steps**:
1. Set environment variables: `TEST_SERVER_CMD=npx`, `TEST_ARG=-y`
2. Start server with `valid-with-env-vars` config
3. Verify server starts successfully
4. Open toolbox and verify downstream server connected
5. Execute tool to confirm server is functional

**Assertions**:
- Server starts with expanded config
- Environment variables resolved correctly
- Downstream servers accessible

---

### Test 2.2: Tool Filters

**Purpose**: Validate tool filtering works correctly

**Given**: Configuration with `toolFilters` specified
**When**: Opening toolbox
**Then**: Only filtered tools appear in tool list

**Test Steps**:
1. Start server with `valid-with-tool-filters` config (filters to 2 specific tools)
2. Open toolbox
3. Assert tool list contains only filtered tools
4. Assert unfiltered tools are not present

**Assertions**:
- Tool count matches filter specification
- Only specified tools returned
- Tool schemas still complete

---

### Test 2.3: Multiple Toolboxes

**Purpose**: Validate multiple toolboxes work without cross-contamination

**Given**: Configuration with multiple toolboxes
**When**: E2E tests open different toolboxes
**Then**: Each toolbox has its own set of tools, no cross-contamination

**Test Steps**:
1. Start server with `valid-multiple-toolboxes` config
2. Open toolbox "dev"
3. Assert tools from "dev" toolbox only
4. Open toolbox "prod"
5. Assert tools from "prod" toolbox only
6. Verify no overlap or contamination

**Assertions**:
- Each toolbox returns distinct tools
- Toolbox separation maintained
- No cross-toolbox tool leakage

---

### Test 2.4: Invalid Configuration Handling

**Purpose**: Validate invalid configurations fail fast with clear errors

**Given**: Invalid configuration file
**When**: Workbench starts
**Then**: Fails fast with clear error message

**Test Steps**:
1. Attempt to start server with `invalid-missing-server` config
2. Assert server fails to start
3. Capture error message
4. Assert error indicates which server is missing
5. Assert error is clear enough to diagnose (per SC-005)

**Assertions**:
- Server startup fails
- Error message includes context
- Error is actionable (identifies problem)

---

## User Story 3: Error Handling Verification (P3)

File: `e2e/scenarios/error-handling.e2e.ts`

### Test 3.1: Invalid Tool Name

**Purpose**: Validate error response for non-existent tool

**Given**: Toolbox is open
**When**: Calling `use_tool` with non-existent tool name
**Then**: Error response includes toolbox, server, tool name, and clear message

**Test Steps**:
1. Open valid toolbox
2. Call `use_tool` with identifier `{ toolbox: 'test', server: 'memory', name: 'invalid_tool' }`
3. Assert call throws error
4. Assert error includes toolbox name
5. Assert error includes server name
6. Assert error includes tool name
7. Assert error message is clear

**Assertions**:
- Error thrown
- Error context complete (per FR-007)
- Error message actionable

---

### Test 3.2: Invalid Arguments

**Purpose**: Validate error handling for bad tool arguments

**Given**: Valid tool identifier
**When**: `use_tool` called with invalid arguments
**Then**: Error message clearly identifies validation failure

**Test Steps**:
1. Call `use_tool` with correct identifier
2. Pass invalid arguments (wrong type, missing required)
3. Assert error thrown
4. Assert error indicates argument validation failure
5. Assert error specifies which argument is invalid

**Assertions**:
- Argument validation error thrown
- Error message identifies problem argument
- Error is diagnosable from CI output

---

### Test 3.3: Downstream Server Failure

**Purpose**: Validate error handling when downstream server fails

**Given**: Downstream server crashes during tool execution
**When**: E2E test captures error
**Then**: Error context includes toolbox, server, tool, and original downstream error

**Test Steps**:
1. Setup scenario where downstream server will fail
2. Execute tool that triggers failure
3. Assert error thrown
4. Assert error includes full context
5. Assert original downstream error preserved

**Assertions**:
- Error includes workbench context
- Original error preserved
- Error stack trace available

---

### Test 3.4: Configuration Reference Error

**Purpose**: Validate error when config references non-existent server

**Given**: Configuration with non-existent server command
**When**: Trying to open toolbox
**Then**: Error message helps diagnose configuration issue

**Test Steps**:
1. Start server with `invalid-missing-server` config (references `/nonexistent/server`)
2. Attempt to open toolbox
3. Assert error indicates server not found
4. Assert error message includes server command path
5. Assert error is actionable

**Assertions**:
- Configuration error detected
- Error identifies missing server
- Error helps user fix config

---

## User Story 4: CI/CD Pipeline Integration (P4)

File: `e2e/scenarios/ci-integration.e2e.ts`

### Test 4.1: CI Test Execution

**Purpose**: Validate E2E tests run successfully in CI

**Given**: Pull request opened
**When**: CI triggers
**Then**: E2E tests execute and report results

**Test Steps**:
1. Trigger GitHub Actions workflow
2. Verify E2E test job runs
3. Verify tests execute in CI environment
4. Verify results reported as status check

**Assertions**:
- CI job runs
- Tests execute
- Results available

---

### Test 4.2: Failure Reporting in CI

**Purpose**: Validate test failures reported clearly in CI

**Given**: E2E test fails
**When**: Viewing workflow output
**Then**: Failure details clear enough to diagnose

**Test Steps**:
1. Introduce deliberate test failure
2. Run in CI
3. Capture workflow output
4. Assert failure message includes stack trace
5. Assert 90% diagnosable without local reproduction (per SC-005)

**Assertions**:
- Failure clearly reported
- Stack trace available
- Error context sufficient

---

### Test 4.3: Success Status Check

**Purpose**: Validate passing tests show green status

**Given**: E2E tests pass
**When**: Reviewing PR
**Then**: Green status indicates healthy workflows

**Test Steps**:
1. Run full test suite
2. All tests pass
3. Verify GitHub status check is green
4. Verify PR mergeable

**Assertions**:
- Status check passes
- PR shows green checkmark
- CI confidence high

---

### Test 4.4: Execution Time Reporting

**Purpose**: Validate test metrics displayed in CI

**Given**: E2E tests complete
**When**: Viewing summary
**Then**: Execution time and test count displayed

**Test Steps**:
1. Run full suite
2. Capture CI summary
3. Verify total test count shown
4. Verify execution time shown
5. Assert under 5-minute target (per FR-011)

**Assertions**:
- Test count accurate
- Execution time < 5 minutes
- Metrics visible in CI

---

## Test Execution Matrix

| Scenario | User Story | Priority | Isolation | Expected Duration |
|----------|------------|----------|-----------|-------------------|
| workflow-validation.e2e.ts | US1 | P1 | Port | 30-60s |
| configuration.e2e.ts | US2 | P2 | Port | 45-75s |
| error-handling.e2e.ts | US3 | P3 | Port | 30-45s |
| ci-integration.e2e.ts | US4 | P4 | Port/Container | 60-90s |

**Total Expected**: ~3 minutes (well under 5-minute target)

---

## Pass/Fail Criteria

Per clarifications:
- ✅ Pass/fail status only (no performance metrics)
- ✅ No automatic retries (manual investigation only)
- ✅ Cleanup failures abort entire run
- ✅ 90% of failures diagnosable from CI output alone
