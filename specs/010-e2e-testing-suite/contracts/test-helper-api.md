# Test Helper API Contract

**Purpose**: Define the programmatic API for E2E test helpers
**Type**: TypeScript Module Contracts

## Server Manager API

Module: `e2e/helpers/server-manager.ts`

### `startServer(config: ServerStartConfig): Promise<TestServerInstance>`

Starts a workbench server instance for testing.

**Parameters**:
```typescript
interface ServerStartConfig {
  configPath: string;          // Absolute path to test configuration file
  port: number;                // Port to bind server to
  env?: Record<string, string>; // Additional environment variables
  timeout?: number;            // Startup timeout in ms (default: 10000)
}
```

**Returns**: `Promise<TestServerInstance>` - Running server instance

**Behavior**:
- Spawns workbench server as child process with given config
- Waits for server to be ready (listening on port)
- Captures stdout/stderr for debugging
- Throws if server fails to start within timeout
- Throws if port is already in use

**Error Scenarios**:
- `ServerStartError`: Server failed to start (includes stdout/stderr)
- `PortInUseError`: Port already occupied
- `TimeoutError`: Server didn't start within timeout

**Example**:
```typescript
const server = await startServer({
  configPath: '/path/to/test-config.json',
  port: 50123,
  env: { TEST_VAR: 'value' },
  timeout: 10000
});
```

---

### `stopServer(instance: TestServerInstance): Promise<void>`

Stops a running workbench server instance.

**Parameters**:
- `instance`: TestServerInstance - Server to stop

**Behavior**:
- Sends SIGTERM to server process
- Waits for graceful shutdown (max 5 seconds)
- Sends SIGKILL if server doesn't stop
- Cleans up temp files and connections
- **Per clarifications**: Throws if cleanup fails (fails entire test run)

**Error Scenarios**:
- `CleanupError`: Server cleanup failed (causes test run to abort per FR-006)

**Example**:
```typescript
await stopServer(server);  // Throws if cleanup fails
```

---

## Client Factory API

Module: `e2e/helpers/client-factory.ts`

### `createMCPClient(serverPort: number): Promise<MCPTestClient>`

Creates and connects an MCP client to the workbench server.

**Parameters**:
- `serverPort`: number - Port where workbench server is listening

**Returns**: `Promise<MCPTestClient>` - Connected MCP client wrapper

**Behavior**:
- Creates StdioClientTransport connecting to workbench on given port
- Initializes MCP Client using @modelcontextprotocol/sdk
- Waits for connection handshake to complete
- Returns wrapped client with test helper methods

**Error Scenarios**:
- `ConnectionError`: Failed to connect to server
- `HandshakeError`: MCP initialization failed

**Example**:
```typescript
const client = await createMCPClient(50123);
```

---

### MCPTestClient Methods

#### `openToolbox(name: string): Promise<ToolInfo[]>`

Opens a toolbox and returns tools.

**Parameters**:
- `name`: string - Toolbox name

**Returns**: `Promise<ToolInfo[]>` - Array of tool metadata with schemas

**Behavior**:
- Calls workbench `open_toolbox` meta-tool
- Parses response and extracts tool list
- Stores opened toolbox in `this.openedToolboxes`
- Returns full tool definitions including schemas

**Example**:
```typescript
const tools = await client.openToolbox('test');
expect(tools).toHaveLength(5);
```

---

#### `useTool(identifier: ToolIdentifier, args: any): Promise<any>`

Executes a tool via use_tool meta-tool.

**Parameters**:
- `identifier`: ToolIdentifier - Structured tool identifier `{ toolbox, server, name }`
- `args`: any - Tool arguments

**Returns**: `Promise<any>` - Tool execution result

**Behavior**:
- Calls workbench `use_tool` meta-tool
- Passes structured identifier and arguments
- Returns tool response
- Throws if tool execution fails

**Error Scenarios**:
- `ToolNotFoundError`: Invalid tool identifier
- `ArgumentValidationError`: Invalid arguments
- `ToolExecutionError`: Tool failed during execution

**Example**:
```typescript
const result = await client.useTool(
  { toolbox: 'test', server: 'memory', name: 'store_value' },
  { key: 'test', value: 'hello' }
);
```

---

#### `disconnect(): Promise<void>`

Closes the MCP client connection.

**Behavior**:
- Gracefully closes transport
- Releases resources
- Marks client as disconnected

---

## Isolation Helper API

Module: `e2e/helpers/isolation.ts`

### `allocatePort(): Promise<number>`

Allocates an available port for test isolation.

**Returns**: `Promise<number>` - Available port number

**Behavior**:
- Finds random available port in range 50000-60000
- Tests port availability using Node.js `net` module
- Returns port number
- Ports are not reserved (use immediately after allocation)

**Example**:
```typescript
const port = await allocatePort();
// Use port immediately
const server = await startServer({ port, ... });
```

---

### `withContainer(testFn: () => Promise<void>): Promise<void>`

Executes test function in isolated container (optional, future enhancement).

**Parameters**:
- `testFn`: () => Promise<void> - Test function to run in container

**Behavior**:
- Creates isolated container with workbench
- Runs test function
- Cleans up container afterwards
- Only available if testcontainers-node is installed

**Example**:
```typescript
await withContainer(async () => {
  // Test runs in isolated container
  const server = await startServer({ ... });
  // ...
});
```

---

## Assertions API

Module: `e2e/helpers/assertions.ts`

### Custom Vitest Matchers

#### `toHaveToolInToolbox(toolbox: string, server: string, name: string)`

Asserts that a tool exists in the given toolbox.

**Usage**:
```typescript
const tools = await client.openToolbox('test');
expect(tools).toHaveToolInToolbox('test', 'memory', 'store_value');
```

---

#### `toMatchToolSchema(expected: ExpectedToolSchema)`

Asserts that a tool's schema matches expectations.

**Usage**:
```typescript
const tools = await client.openToolbox('test');
const tool = tools.find(t => t.name === 'store_value');
expect(tool).toMatchToolSchema({
  toolbox: 'test',
  server: 'memory',
  name: 'store_value',
  inputSchema: { /* ... */ }
});
```

---

#### `toReturnErrorWithContext(toolbox: string, server: string, tool: string)`

Asserts that an error response includes proper context (per FR-007).

**Usage**:
```typescript
await expect(
  client.useTool({ toolbox: 'test', server: 'memory', name: 'invalid' }, {})
).rejects.toReturnErrorWithContext('test', 'memory', 'invalid');
```

---

## Contract Validation

All helper APIs must:
1. ✅ Throw typed errors (not generic Error)
2. ✅ Include context in error messages (toolbox/server/tool names where applicable)
3. ✅ Clean up resources on failure
4. ✅ Support TypeScript with full type definitions
5. ✅ Fail fast with clear error messages (per FR-003)
6. ✅ Abort test run if cleanup fails (per FR-006, clarifications)
