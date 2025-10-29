# Data Model: End-to-End Testing Suite

**Date**: 2025-10-29
**Feature**: E2E Testing Suite
**Purpose**: Define test entities, fixtures, and data structures

## Overview

E2E tests don't persist data but use structured test fixtures and runtime test state. This document defines the data model for test configurations, expected responses, and test execution state.

## Test Entities

### E2ETestConfig

Configuration for a single E2E test run.

**Fields**:
- `testName`: string - Unique identifier for the test
- `workbenchConfig`: WorkbenchConfig - Configuration for workbench server under test
- `port`: number - Dynamically allocated port for this test instance
- `timeout`: number - Test timeout in milliseconds (default: 30000)
- `isolation`: 'port' | 'container' - Isolation strategy for this test

**Validation Rules**:
- `testName` must be unique within test suite
- `port` must be available (checked at runtime)
- `timeout` must be > 0 and ≤ 300000 (5 minutes)

**Example**:
```typescript
{
  testName: "workflow-validation-basic",
  workbenchConfig: { /* see WorkbenchConfigFixture */ },
  port: 50123,  // dynamically allocated
  timeout: 30000,
  isolation: 'port'
}
```

---

### WorkbenchConfigFixture

Test fixture representing a workbench configuration scenario.

**Fields**:
- `name`: string - Fixture identifier (e.g., "valid-single-toolbox")
- `config`: WorkbenchConfig - Actual configuration object
- `expectedBehavior`: 'success' | 'error' - Whether this config should load successfully
- `errorPattern`: string | null - Expected error message pattern if expectedBehavior is 'error'
- `description`: string - Human-readable description of what this fixture tests

**Fixture Categories**:
1. **Valid Configurations**:
   - `valid-single-toolbox`: One toolbox with one downstream server
   - `valid-multiple-toolboxes`: Multiple toolboxes with different servers
   - `valid-with-env-vars`: Configuration using `${VAR}` and `${VAR:-default}` patterns
   - `valid-with-tool-filters`: Toolbox with `toolFilters` specified

2. **Invalid Configurations** (Core Error Scenarios):
   - `invalid-missing-server`: References non-existent server command
   - `invalid-bad-syntax`: Malformed JSON or invalid schema
   - `invalid-missing-required-fields`: Missing mandatory configuration fields
   - `invalid-bad-env-var`: Undefined environment variable without default

**Example**:
```typescript
{
  name: "valid-single-toolbox",
  config: {
    toolboxes: {
      "test": {
        description: "Test toolbox",
        mcpServers: {
          "memory": {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-memory"]
          }
        }
      }
    }
  },
  expectedBehavior: 'success',
  errorPattern: null,
  description: "Basic valid configuration with single toolbox and memory server"
}
```

---

### TestServerInstance

Runtime state for a running workbench server instance in a test.

**Fields**:
- `pid`: number - Process ID of running server
- `port`: number - Port server is listening on
- `configPath`: string - Absolute path to configuration file used
- `startTime`: Date - When server was started
- `stdout`: string[] - Captured stdout lines
- `stderr`: string[] - Captured stderr lines

**Lifecycle**:
1. Created by `server-manager.ts:startServer()`
2. Used by test to interact with server
3. Cleaned up by `server-manager.ts:stopServer()` (fails entire run if cleanup fails)

**State Transitions**:
```
[Starting] → [Running] → [Stopping] → [Stopped]
                ↓
            [Failed] (if crash/error)
```

---

### MCPTestClient

Wrapper around MCP SDK client for test assertions.

**Fields**:
- `client`: Client - MCP SDK client instance
- `transport`: StdioClientTransport - Connection transport
- `connected`: boolean - Connection status
- `openedToolboxes`: string[] - List of toolboxes opened in this session

**Methods**:
- `connect(): Promise<void>` - Establish connection to workbench
- `disconnect(): Promise<void>` - Close connection
- `openToolbox(name: string): Promise<ToolInfo[]>` - Open toolbox and return tools
- `useTool(identifier: ToolIdentifier, args: any): Promise<any>` - Execute tool
- `assertToolExists(toolbox: string, server: string, name: string): void` - Custom assertion

---

### ToolIdentifier

Structured tool identifier used in test assertions.

**Fields**:
- `toolbox`: string - Toolbox name
- `server`: string - Server name within toolbox
- `name`: string - Original tool name

**Validation Rules**:
- All fields must be non-empty strings
- Must match pattern validated by workbench

**Example**:
```typescript
{
  toolbox: "test",
  server: "memory",
  name: "store_value"
}
```

---

### ExpectedToolSchema

Test fixture defining expected tool schema from downstream server.

**Fields**:
- `toolbox`: string - Toolbox containing this tool
- `server`: string - Server providing this tool
- `name`: string - Tool name
- `inputSchema`: object - Expected JSON schema for tool inputs
- `annotations`: object | null - Expected tool annotations

**Purpose**: Used in assertions to verify `open_toolbox` returns correct tool schemas.

**Example**:
```typescript
{
  toolbox: "test",
  server: "memory",
  name: "store_value",
  inputSchema: {
    type: "object",
    properties: {
      key: { type: "string" },
      value: { type: "string" }
    },
    required: ["key", "value"]
  },
  annotations: null
}
```

---

### TestResult

Outcome of a single E2E test scenario.

**Fields**:
- `testName`: string - Test identifier
- `status`: 'pass' | 'fail' - Test outcome (pass/fail only per clarifications)
- `duration`: number - Execution time in milliseconds (for internal use, not reported)
- `error`: Error | null - Error object if test failed
- `assertionCount`: number - Number of assertions executed

**Output Format** (per clarifications):
- Pass/fail status only
- No performance metrics in CI output
- Stack traces included for failures (for 90% diagnosability)

---

## Test Fixture Organization

### Configuration Fixtures

Location: `e2e/fixtures/configs/`

Files:
- `valid-single-toolbox.json` - Basic valid config
- `valid-multiple-toolboxes.json` - Multiple toolboxes
- `valid-with-env-vars.json` - Environment variable usage
- `valid-with-tool-filters.json` - Tool filtering
- `invalid-missing-server.json` - Non-existent server binary
- `invalid-bad-syntax.json` - Malformed JSON
- `invalid-missing-fields.json` - Schema validation failure
- `invalid-undefined-env-var.json` - Unset required environment variable

### Expected Response Fixtures

Location: `e2e/fixtures/expected-responses/`

Files:
- `tool-schemas.ts` - Expected tool schemas from downstream servers
- `error-messages.ts` - Expected error message patterns
- `toolbox-listings.ts` - Expected toolbox discovery responses

### Downstream Server Setup

Location: `e2e/fixtures/downstream-servers/`

Files:
- `test-server-setup.ts` - Functions to spawn/manage downstream MCP servers
- `server-configs.ts` - Configuration objects for test servers

---

## Relationships

```
E2ETestConfig
  ├─contains─> WorkbenchConfigFixture
  └─creates──> TestServerInstance
                 └─connected─by─> MCPTestClient
                                    ├─uses─> ToolIdentifier
                                    └─validates─> ExpectedToolSchema

TestResult
  ├─reports─on─> E2ETestConfig
  └─contains──> Error (if failed)
```

---

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| E2ETestConfig | Unique test names, available ports, valid timeouts |
| WorkbenchConfigFixture | Matches expected behavior (success/error), error patterns correct |
| TestServerInstance | Process running, port listening, cleanup successful |
| MCPTestClient | Connected before operations, proper disconnection |
| ToolIdentifier | Non-empty fields, matches workbench validation |
| ExpectedToolSchema | Schema matches downstream server definition |

All validation failures must produce clear error messages (per FR-003, FR-007, SC-005).
