# Implementation Plan: End-to-End Testing Suite

**Branch**: `010-e2e-testing-suite` | **Date**: 2025-10-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-e2e-testing-suite/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a comprehensive E2E testing suite that validates the complete workbench workflow from configuration loading through tool execution. Tests will run in isolated environments (containers or dynamic port allocation) to enable parallel execution, use real downstream MCP servers, and provide pass/fail status only without performance metrics. The suite will integrate with CI/CD pipelines and complete execution within 5 minutes.

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js 18+ (matching existing workbench codebase)
**Primary Dependencies**: Vitest (test runner), @modelcontextprotocol/sdk (MCP client/server), testcontainers-node (optional container isolation)
**Storage**: N/A (tests use in-memory state and temporary configurations)
**Testing**: Vitest + custom MCP test harness (see research.md for framework selection rationale)
**Target Platform**: Cross-platform (Linux, macOS, Windows) matching workbench server requirements
**Project Type**: Single project (E2E test suite integrated into existing workbench monorepo)
**Performance Goals**: Complete full E2E test suite in under 5 minutes; individual test scenarios complete in under 30 seconds
**Constraints**: Must support parallel execution via isolated environments (containers/dynamic ports); no flaky tests (100% deterministic); pass/fail output only (no performance metrics)
**Scale/Scope**: Validate 4 critical user workflows (P1-P4), test against 3+ different downstream MCP server types, cover core error scenarios (invalid config, missing servers, bad tool names, invalid arguments)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principle Alignment

**✅ I. Meta-Server Orchestration Pattern**: Tests will validate the meta-server pattern by starting the workbench server, connecting as MCP clients, and exercising `open_toolbox` and `use_tool` meta-tools against real downstream servers.

**✅ II. Tool Naming and Conflict Resolution**: E2E tests will verify structured tool naming `{ toolbox, server, name }` works correctly, including scenarios with duplicate tools across toolboxes.

**✅ III. Proxy-Based Tool Invocation**: Tests will validate the proxy pattern by executing tools via `use_tool` meta-tool and verifying correct delegation to downstream servers.

**✅ IV. Configuration as Contract**: Test fixtures will include various configuration scenarios (valid, invalid, environment variables, tool filters) to validate configuration loading and error handling.

**✅ V. Fail-Safe Error Handling**: Core error scenarios will be tested (invalid tool names, bad arguments, connection failures, missing servers) to verify error context includes toolbox/server/tool names.

**✅ VI. Release Policy and Workflow**: E2E tests will integrate into CI/CD pipeline via GitHub Actions to run on all PRs and main branch commits, blocking merges on failures.

**✅ VII. Incubation Stage Policy**: E2E testing suite follows relaxed semver during incubation (< 1.0.0); breaking changes to test structure are expected as testing approach evolves.

**✅ VIII. Documentation Synchronization**: Implementation will include README.md updates for running E2E tests locally and CLAUDE.md updates documenting E2E test architecture and patterns.

### Gate Status: ✅ PASS

All core principles align with E2E testing goals. No violations or complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing workbench structure
src/
├── index.ts              # Main MCP server
├── client-manager.ts     # Connection pooling
├── config-loader.ts      # Configuration validation
├── env-expander.ts       # Environment variable expansion
└── types.ts              # Type definitions

# New E2E test structure
e2e/
├── fixtures/
│   ├── configs/
│   │   ├── valid-single-toolbox.json
│   │   ├── valid-multiple-toolboxes.json
│   │   ├── valid-with-env-vars.json
│   │   ├── invalid-missing-server.json
│   │   ├── invalid-bad-syntax.json
│   │   └── valid-with-tool-filters.json
│   ├── downstream-servers/
│   │   └── test-server-setup.ts
│   └── expected-responses/
│       └── tool-schemas.ts
├── helpers/
│   ├── server-manager.ts      # Start/stop workbench programmatically
│   ├── client-factory.ts      # Create MCP test clients
│   ├── isolation.ts           # Container/port management for parallel tests
│   └── assertions.ts          # Custom E2E assertions
├── scenarios/
│   ├── workflow-validation.e2e.ts    # US1: Complete workflow tests
│   ├── configuration.e2e.ts          # US2: Config validation tests
│   ├── error-handling.e2e.ts         # US3: Error scenario tests
│   └── ci-integration.e2e.ts         # US4: CI/CD integration tests
└── e2e.config.ts                     # E2E test configuration

# CI/CD integration
.github/
└── workflows/
    ├── e2e-tests.yml         # New E2E test workflow
    └── build.yml             # Existing (will trigger E2E tests)
```

**Structure Decision**: E2E tests are organized in a dedicated `e2e/` directory at repository root, separate from unit/integration tests. This structure supports:
- Isolated test fixtures (configurations, downstream server setups)
- Reusable test helpers for server management and client creation
- Test scenarios organized by user story (US1-US4)
- Clear separation between E2E and other test types

## Complexity Tracking

No constitution violations. All principles align with E2E testing approach.
