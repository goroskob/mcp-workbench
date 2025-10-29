# Quick Start: E2E Testing Suite

**Purpose**: Get E2E tests running locally and in CI
**Audience**: Developers implementing and running E2E tests

## Prerequisites

- Node.js 18+ installed
- Repository cloned and dependencies installed (`npm install`)
- Workbench codebase built (`npm run build`)

## Running E2E Tests Locally

### Run Full Test Suite

```bash
# Run all E2E tests
npm run test:e2e

# Expected output:
# ✓ e2e/scenarios/workflow-validation.e2e.ts (9 tests)
# ✓ e2e/scenarios/configuration.e2e.ts (10 tests)
# ✓ e2e/scenarios/error-handling.e2e.ts (12 tests)
# ✓ e2e/scenarios/ci-integration.e2e.ts (6 tests)
#
# Test Summary: 37 passed, 0 failed
```

### Run Specific Scenario

```bash
# Run only workflow validation tests
npm run test:e2e -- workflow-validation

# Run only configuration tests
npm run test:e2e -- configuration
```

### Watch Mode (Development)

```bash
# Re-run tests on file changes
npm run test:e2e:watch
```

### With Container Isolation (Optional)

```bash
# Run tests in isolated containers
# Requires Docker installed
npm run test:e2e -- --use-containers
```

---

## Project Setup

The following structure will be created:

```
mcp-workbench/
├── e2e/                                    # E2E test suite
│   ├── fixtures/                           # Test fixtures
│   │   ├── configs/                        # Configuration fixtures
│   │   │   ├── valid-single-toolbox.json
│   │   │   ├── valid-multiple-toolboxes.json
│   │   │   ├── valid-with-env-vars.json
│   │   │   └── invalid-*.json
│   │   ├── downstream-servers/             # Downstream server setup
│   │   │   └── test-server-setup.ts
│   │   └── expected-responses/             # Expected response fixtures
│   │       └── tool-schemas.ts
│   ├── helpers/                            # Test helpers
│   │   ├── server-manager.ts               # Start/stop workbench
│   │   ├── client-factory.ts               # Create MCP clients
│   │   ├── isolation.ts                    # Port/container isolation
│   │   └── assertions.ts                   # Custom assertions
│   ├── scenarios/                          # Test scenarios
│   │   ├── workflow-validation.e2e.ts      # US1 tests
│   │   ├── configuration.e2e.ts            # US2 tests
│   │   ├── error-handling.e2e.ts           # US3 tests
│   │   └── ci-integration.e2e.ts           # US4 tests
│   └── e2e.config.ts                       # E2E configuration
├── package.json                            # Updated with E2E scripts
└── vitest.config.e2e.ts                    # Vitest E2E config
```

---

## Writing Your First E2E Test

### Step 1: Create Test File

Create `e2e/scenarios/example.e2e.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer, stopServer } from '../helpers/server-manager';
import { createMCPClient } from '../helpers/client-factory';
import { allocatePort } from '../helpers/isolation';
import type { TestServerInstance, MCPTestClient } from '../helpers/types';

describe('Example E2E Test', () => {
  let server: TestServerInstance;
  let client: MCPTestClient;
  let port: number;

  beforeAll(async () => {
    // Allocate port for isolation
    port = await allocatePort();

    // Start workbench server
    server = await startServer({
      configPath: './e2e/fixtures/configs/valid-single-toolbox.json',
      port,
      timeout: 10000
    });

    // Create and connect MCP client
    client = await createMCPClient(port);
  });

  afterAll(async () => {
    // Cleanup (fails test run if cleanup fails)
    await client.disconnect();
    await stopServer(server);
  });

  it('should open toolbox and list tools', async () => {
    // Open toolbox
    const tools = await client.openToolbox('test');

    // Assert tools returned
    expect(tools).toBeInstanceOf(Array);
    expect(tools.length).toBeGreaterThan(0);

    // Assert tool has structured identifier
    expect(tools[0]).toHaveProperty('toolbox');
    expect(tools[0]).toHaveProperty('server');
    expect(tools[0]).toHaveProperty('name');
  });
});
```

### Step 2: Run Your Test

```bash
npm run test:e2e -- example
```

---

## Common Test Patterns

### Pattern 1: Test Configuration Loading

```typescript
it('should load configuration with environment variables', async () => {
  // Set environment variables
  process.env.TEST_VAR = 'test-value';

  // Start server with env var config
  const server = await startServer({
    configPath: './e2e/fixtures/configs/valid-with-env-vars.json',
    port: await allocatePort()
  });

  // Verify server started successfully
  expect(server.pid).toBeGreaterThan(0);

  await stopServer(server);
});
```

### Pattern 2: Test Error Handling

```typescript
it('should return error with context for invalid tool', async () => {
  // Open toolbox
  await client.openToolbox('test');

  // Try to use invalid tool
  await expect(
    client.useTool(
      { toolbox: 'test', server: 'memory', name: 'invalid_tool' },
      {}
    )
  ).rejects.toThrow(/invalid_tool/);
});
```

### Pattern 3: Test Tool Execution

```typescript
it('should execute tool and return result', async () => {
  // Open toolbox
  await client.openToolbox('test');

  // Execute tool
  const result = await client.useTool(
    { toolbox: 'test', server: 'memory', name: 'store_value' },
    { key: 'test-key', value: 'test-value' }
  );

  // Assert success
  expect(result).toBeDefined();
});
```

---

## CI Integration

### GitHub Actions Workflow

E2E tests run automatically on:
- All pull requests
- Commits to `main` branch

Workflow file: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
```

### Viewing Results

1. **In PR**: Check the "E2E Tests" status check
2. **In Workflow**: View detailed logs in Actions tab
3. **Failures**: Stack traces appear in workflow output

---

## Debugging Failed Tests

### Local Debugging

```bash
# Run single test with verbose output
npm run test:e2e -- example --reporter=verbose

# Keep server running after test failure
npm run test:e2e -- example --no-cleanup

# View server logs
cat /tmp/workbench-e2e-*.log
```

### CI Debugging

1. Check workflow logs for stack traces
2. Look for error context (toolbox/server/tool names)
3. Reproduce locally:
   ```bash
   # Use same Node version as CI
   nvm use 18
   npm run test:e2e
   ```

---

## Performance Targets

| Target | Requirement | Status |
|--------|-------------|--------|
| Full suite execution | < 5 minutes | Target |
| Individual test | < 30 seconds | Target |
| Server startup | < 10 seconds | Target |
| CI feedback time | < 5 minutes | Target |

---

## Test Isolation

### Default: Port-Based Isolation

- Each test gets unique port (50000-60000 range)
- Fast (no container overhead)
- Works on all platforms

### Optional: Container Isolation

```bash
# Requires Docker
npm run test:e2e -- --use-containers
```

Benefits:
- Stronger isolation (separate network namespace)
- Useful for CI with strict security
- Slightly slower (container startup time)

---

## Troubleshooting

### Problem: Port Already in Use

**Solution**: Tests should allocate dynamic ports. If issue persists:
```bash
# Kill any lingering processes
pkill -f "node.*workbench"
```

### Problem: Test Timeout

**Solution**: Increase timeout in test:
```typescript
it('slow test', async () => {
  // Test code
}, 60000);  // 60 second timeout
```

### Problem: Flaky Tests

**Solution**: Per clarifications, no automatic retries. Investigate:
1. Check for shared state between tests
2. Verify proper cleanup (beforeAll/afterAll)
3. Ensure ports are unique per test
4. Check for race conditions in test logic

---

## Next Steps

1. **Read test scenarios**: `specs/010-e2e-testing-suite/contracts/test-scenarios-spec.md`
2. **Review data model**: `specs/010-e2e-testing-suite/data-model.md`
3. **Implement helpers**: Start with `server-manager.ts` and `client-factory.ts`
4. **Write tests**: Follow user story priorities (US1 → US2 → US3 → US4)
5. **Run locally**: Verify tests pass before pushing
6. **Check CI**: Ensure E2E tests pass in GitHub Actions

---

## Quick Reference

```bash
# Run all E2E tests
npm run test:e2e

# Run specific scenario
npm run test:e2e -- workflow-validation

# Watch mode
npm run test:e2e:watch

# With containers
npm run test:e2e -- --use-containers

# Verbose output
npm run test:e2e -- --reporter=verbose
```

**Documentation**:
- Research decisions: `research.md`
- Data model: `data-model.md`
- API contracts: `contracts/test-helper-api.md`
- Test scenarios: `contracts/test-scenarios-spec.md`
