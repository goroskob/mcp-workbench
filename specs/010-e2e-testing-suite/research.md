# Research: End-to-End Testing Suite

**Date**: 2025-10-29
**Feature**: E2E Testing Suite for MCP Workbench
**Purpose**: Resolve technical decisions for E2E test framework and isolation approach

## Decision 1: E2E Test Framework

**Decision**: Use Vitest with custom MCP test harness

**Rationale**:
- **Vitest** is the natural choice for TypeScript projects with existing Node.js/TS tooling
  - Zero-config for TypeScript (already used in the project)
  - Fast execution with native ES modules support
  - Built-in watch mode and parallel test execution
  - Excellent TypeScript DX with type-safe mocks and assertions
  - Compatible with existing Node.js ecosystem

- **Custom MCP Test Harness** needed because:
  - Playwright/Puppeteer are designed for browser automation, not MCP protocol testing
  - MCP communication happens over stdio/HTTP, not browser interfaces
  - Need programmatic control over workbench server lifecycle
  - Need to create MCP client connections using @modelcontextprotocol/sdk
  - Need custom assertions for MCP-specific responses (toolbox lists, tool schemas, structured identifiers)

**Alternatives Considered**:
1. **Jest**: Mature but slower, less modern TypeScript support, requires more configuration
2. **Playwright**: Excellent for browser E2E but not applicable to MCP server/protocol testing
3. **Custom test runner**: Too much reinvention, Vitest provides all needed primitives
4. **Bare Node.js with assert**: No parallel execution, no watch mode, poor developer experience

**Implementation Approach**:
- Use Vitest as the test runner and assertion library
- Build custom helpers (`server-manager.ts`, `client-factory.ts`) using MCP SDK
- Organize tests in `e2e/scenarios/` with `.e2e.ts` suffix to distinguish from unit tests
- Configure Vitest to run E2E tests separately from unit tests (different config files)

**Primary Dependencies Added**:
- `vitest` (test runner)
- `@modelcontextprotocol/sdk` (MCP client/server libraries - already in project)
- Potentially `testcontainers` (if using container isolation) or custom port allocation logic

---

## Decision 2: Test Isolation Strategy

**Decision**: Dynamic port allocation with optional container support

**Rationale**:
- **Dynamic Port Allocation** as the primary isolation mechanism:
  - Simple to implement: allocate random available ports for each test run
  - Fast execution: no container startup overhead
  - Works on all platforms (Linux, macOS, Windows)
  - Enables parallel test execution without conflicts
  - Implementation: Use Node.js `net` module to find available ports before starting servers

- **Container Support** as an optional enhancement:
  - Provides stronger isolation (separate network namespace, filesystem)
  - Useful for CI environments with strict security requirements
  - Can be added later without changing test structure
  - Implementation: Use testcontainers-node if needed

**Alternatives Considered**:
1. **Sequential execution only**: Simple but slow, doesn't meet future parallel requirement
2. **Fixed ports with mutex locking**: Complex, error-prone, doesn't scale well
3. **Container-only isolation**: Slower startup, adds Docker dependency, overkill for most tests
4. **Separate VMs**: Too heavyweight, unnecessary complexity

**Implementation Approach**:
1. Create `isolation.ts` helper with `allocatePort()` function
2. Modify `server-manager.ts` to accept port parameter
3. Each test allocates its own port before starting workbench server
4. Cleanup ensures ports are released (tests fail if cleanup fails per clarifications)
5. Optional: Add `--use-containers` flag for container-based isolation in CI

**Testing Constraints Validation**:
- ✅ Supports parallel execution (dynamic ports prevent conflicts)
- ✅ 100% deterministic (no shared state between tests)
- ✅ Fast (no container overhead by default)
- ✅ Cross-platform (works on Linux/macOS/Windows)

---

## Decision 3: Downstream MCP Server Fixtures

**Decision**: Use published npm packages with programmatic setup

**Rationale**:
- Use real MCP servers from `@modelcontextprotocol/*` packages:
  - `@modelcontextprotocol/server-memory`: Simple key-value storage, great for basic tests
  - `@modelcontextprotocol/server-filesystem`: File operations, tests more complex scenarios
  - `@modelcontextprotocol/server-sqlite`: Database operations, validates data persistence patterns

- Benefits:
  - Tests validate against actual MCP protocol implementations
  - Catches real protocol compatibility issues
  - No need to maintain mock servers
  - Fixtures are versioned with npm dependencies

**Implementation**:
- Create `downstream-servers/test-server-setup.ts` that:
  - Spawns downstream servers as child processes
  - Manages their lifecycle (start/stop)
  - Provides configuration objects for workbench test configs
  - Ensures cleanup on test failure

**Core Error Scenario Fixtures** (per clarifications):
1. Invalid configuration (malformed JSON, missing required fields)
2. Missing servers (configuration references non-existent server binary)
3. Bad tool names (calling use_tool with invalid tool identifier)
4. Invalid arguments (passing wrong argument types to tools)

---

## Decision 4: CI/CD Integration

**Decision**: GitHub Actions workflow with E2E test job

**Rationale**:
- Existing `.github/workflows/build.yml` already runs on PR and main commits
- Add new `.github/workflows/e2e-tests.yml` workflow that:
  - Runs after build succeeds
  - Installs downstream MCP server dependencies
  - Executes E2E test suite
  - Reports results as GitHub status check
  - Blocks PR merges on failure

**Test Execution Flow in CI**:
1. Build workbench (existing build workflow)
2. Install E2E dependencies (`npm install` includes test packages)
3. Run E2E tests: `npm run test:e2e`
4. Report results (pass/fail only, per clarifications)
5. Fail workflow if any test fails (per FR-009)

**Local Development**:
- Developers run `npm run test:e2e` to execute full suite locally
- Use `npm run test:e2e:watch` for watch mode during development
- Use `npm run test:e2e:single -- workflow-validation` to run specific scenario

---

## Decision 5: Test Output Format

**Decision**: Standard Vitest reporter with custom pass/fail summary

**Rationale**:
- Per clarifications: pass/fail status only, no performance metrics or detailed traces
- Vitest's default reporter provides:
  - Clear pass/fail status per test
  - Test count and execution summary
  - Stack traces for failures (needed for 90% diagnosability criterion)
- Custom summary reporter can be added to provide cleaner CI output if needed

**Output Examples**:
```
✓ e2e/scenarios/workflow-validation.e2e.ts (5 tests) 2.3s
  ✓ should connect to workbench and list toolboxes
  ✓ should open toolbox and retrieve tool list
  ✓ should execute tool via use_tool
  ✓ should clean up connections properly
  ✓ should handle multiple sequential tests

✗ e2e/scenarios/error-handling.e2e.ts (4 tests) 1.1s
  ✓ should return error for invalid tool name
  ✓ should return error for bad arguments
  ✗ should return error for connection failure
    Error: Server did not start within timeout
    at server-manager.ts:45:13
  ✓ should return error for missing downstream server

Test Summary:
  Total: 9
  Passed: 8
  Failed: 1
```

---

## Summary of Technical Decisions

| Decision | Choice | Key Benefit |
|----------|--------|-------------|
| Test Framework | Vitest + Custom MCP Harness | Fast, TypeScript-native, parallel execution |
| Isolation | Dynamic Port Allocation | Simple, fast, enables parallelization |
| Downstream Servers | Published npm packages | Real protocol testing, no mocks |
| CI Integration | GitHub Actions workflow | Automated PR checks, blocks bad merges |
| Output Format | Vitest default reporter | Pass/fail only, clear failure context |

All NEEDS CLARIFICATION items from Technical Context are now resolved.
