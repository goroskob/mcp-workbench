# Quickstart: Environment Variable Expansion

**Feature**: Environment Variable Expansion in Configuration
**Date**: 2025-10-27
**Purpose**: Step-by-step guide for developers implementing this feature

## Overview

This guide walks you through implementing environment variable expansion in the MCP Workbench configuration loader. The feature allows users to reference environment variables in their configuration files using `${VAR}` and `${VAR:-default}` syntax.

**Estimated Implementation Time**: 4-6 hours (including testing)

---

## Prerequisites

Before starting implementation:

1. **Read Documentation**:
   - [ ] Feature specification: [spec.md](spec.md)
   - [ ] Research findings: [research.md](research.md)
   - [ ] Data model: [data-model.md](data-model.md)
   - [ ] API contract: [contracts/expansion-api.md](contracts/expansion-api.md)

2. **Understand Existing Code**:
   - [ ] Review [src/config-loader.ts](../../../src/config-loader.ts) - configuration loading logic
   - [ ] Review [src/types.ts](../../../src/types.ts) - type definitions
   - [ ] Understand Zod validation in config-loader.ts

3. **Set Up Testing Environment**:
   - [ ] Create test directory: `tests/config-expansion/`
   - [ ] Prepare environment variables for testing
   - [ ] Identify test MCP servers (e.g., @modelcontextprotocol/server-memory)

---

## Implementation Steps

### Step 1: Create Environment Variable Expander (30 min)

**File**: `src/env-expander.ts` (new file)

**Tasks**:
1. Create EnvExpansionError class
2. Implement expandEnvVars function with recursive object walking
3. Implement string expansion with regex pattern matching
4. Add validation for variable names (POSIX-compliant)

**Code Structure**:
```typescript
// src/env-expander.ts

/**
 * Error thrown when environment variable expansion fails.
 */
export class EnvExpansionError extends Error {
  constructor(
    public readonly variable: string,
    public readonly jsonPath: string,
    public readonly reason: string
  ) {
    // Build error message with context and help text
  }
}

/**
 * Recursively expand environment variables in configuration values.
 */
export function expandEnvVars(
  value: unknown,
  jsonPath: string = ""
): unknown {
  // 1. Handle strings (expand ${...} patterns)
  // 2. Handle arrays (recursively expand elements)
  // 3. Handle objects (recursively expand keys and values)
  // 4. Handle primitives (return unchanged)
}

/**
 * Expand environment variable references in a single string.
 */
function expandString(str: string, jsonPath: string): string {
  // Use regex to find and replace ${VAR} and ${VAR:-default}
  // Throw EnvExpansionError for missing required variables
}
```

**Regex Pattern** (from research.md):
```typescript
const ENV_VAR_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g;
```

**Testing Checkpoint**:
```bash
# Create test file: tests/config-expansion/test-basic.json
# Run manual tests with environment variables set
export TEST_VAR="test_value"
export LOG_LEVEL="debug"
```

**Expected Output**:
- Strings with `${VAR}` patterns are replaced
- Missing required variables throw EnvExpansionError with context
- Defaults are used when variables are unset

---

### Step 2: Integrate with Configuration Loader (20 min)

**File**: `src/config-loader.ts` (modify existing)

**Tasks**:
1. Import expandEnvVars and EnvExpansionError from env-expander.ts
2. Call expandEnvVars before Zod validation
3. Add error handling for expansion failures
4. Preserve existing error handling for other failure modes

**Code Changes**:
```typescript
// Add import at top of file
import { expandEnvVars, EnvExpansionError } from './env-expander.js';

// Modify loadConfig function
export function loadConfig(path: string): WorkbenchConfig {
  const rawConfig = JSON.parse(fs.readFileSync(path, 'utf-8'));

  // NEW: Expand environment variables before validation
  try {
    const expandedConfig = expandEnvVars(rawConfig, 'config');
    return validateConfig(expandedConfig);  // Existing Zod validation
  } catch (error) {
    if (error instanceof EnvExpansionError) {
      // Provide additional context about which config file failed
      throw new Error(`Failed to load configuration from ${path}:\n${error.message}`);
    }
    throw error;  // Re-throw other errors unchanged
  }
}
```

**Testing Checkpoint**:
```bash
# Create workbench-config.test.json with env vars
export API_KEY="test_key"
export WORKBENCH_CONFIG=workbench-config.test.json
npm run dev
```

**Expected Output**:
- Server starts successfully with expanded configuration
- Missing required variables prevent server startup with clear error message
- Existing configurations without env vars still work

---

### Step 3: Create Test Configurations (30 min)

**Directory**: `tests/config-expansion/` (create if doesn't exist)

**Test Files to Create**:

**1. test-basic.json** - Basic expansion
```json
{
  "toolboxes": {
    "test": {
      "description": "Test basic expansion",
      "mcpServers": {
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"],
          "env": {
            "TEST_VAR": "${TEST_VAR}"
          }
        }
      }
    }
  }
}
```

**2. test-defaults.json** - Default values
```json
{
  "toolboxes": {
    "test": {
      "description": "Test default values",
      "mcpServers": {
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"],
          "env": {
            "LOG_LEVEL": "${LOG_LEVEL:-info}",
            "PORT": "${PORT:-3000}"
          }
        }
      }
    }
  }
}
```

**3. test-all-fields.json** - Expansion in all config fields
```json
{
  "toolboxes": {
    "test": {
      "description": "Test expansion in all fields",
      "mcpServers": {
        "server": {
          "command": "${SERVER_COMMAND}",
          "args": ["${SERVER_ARG1}", "${SERVER_ARG2:-default-arg}"],
          "env": {
            "API_KEY": "${API_KEY}",
            "LOG_LEVEL": "${LOG_LEVEL:-info}"
          }
        }
      }
    }
  }
}
```

**4. test-missing-var.json** - Error handling
```json
{
  "toolboxes": {
    "test": {
      "description": "Test missing required variable",
      "mcpServers": {
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"],
          "env": {
            "MISSING_VAR": "${MISSING_VAR}"
          }
        }
      }
    }
  }
}
```

**Testing Instructions**:
```bash
# Test 1: Basic expansion
export TEST_VAR="test_value"
export WORKBENCH_CONFIG=tests/config-expansion/test-basic.json
npm run dev
# Expected: Server starts, TEST_VAR expanded

# Test 2: Defaults
unset LOG_LEVEL
unset PORT
export WORKBENCH_CONFIG=tests/config-expansion/test-defaults.json
npm run dev
# Expected: LOG_LEVEL="info", PORT="3000" (defaults used)

# Test 3: All fields
export SERVER_COMMAND="node"
export SERVER_ARG1="server.js"
export API_KEY="secret123"
unset SERVER_ARG2
unset LOG_LEVEL
export WORKBENCH_CONFIG=tests/config-expansion/test-all-fields.json
npm run dev
# Expected: All fields expanded correctly

# Test 4: Missing variable error
unset MISSING_VAR
export WORKBENCH_CONFIG=tests/config-expansion/test-missing-var.json
npm run dev
# Expected: Server fails to start with clear error message
```

---

### Step 4: Update Documentation (45 min)

**Files to Update**:
1. README.md - User-facing documentation
2. CLAUDE.md - Developer/architecture documentation

**README.md Changes**:

Add new section after "Configuration Format":

```markdown
## Environment Variable Expansion

The workbench configuration supports environment variable expansion, allowing you to externalize sensitive credentials and machine-specific paths.

### Syntax

- `${VARIABLE}` - Required variable (error if not set)
- `${VARIABLE:-default}` - Optional variable with default value

### Supported Fields

Environment variables can be used in:
- `command` - Server executable path
- `args` - Command-line arguments
- `env` - Environment variables passed to server
- `url` - Server URL (for HTTP-based servers)
- `headers` - HTTP headers (for HTTP-based servers)

### Example Configuration

```json
{
  "toolboxes": {
    "dev": {
      "description": "Development toolbox",
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["${PROJECT_ROOT}/server.js"],
          "env": {
            "API_KEY": "${API_KEY}",
            "LOG_LEVEL": "${LOG_LEVEL:-info}",
            "DATABASE_URL": "${DATABASE_URL}"
          }
        }
      }
    }
  }
}
```

### Usage

Set environment variables before starting the server:

```bash
export PROJECT_ROOT=/home/user/project
export API_KEY=secret123
export DATABASE_URL=postgresql://localhost/mydb
# LOG_LEVEL not set - will use default "info"

export WORKBENCH_CONFIG=workbench-config.json
npm start
```

### Error Handling

If a required environment variable is not set, the server will fail to start with a clear error message:

```
Failed to load configuration from workbench-config.json:
Environment variable expansion failed
  Variable: API_KEY
  Location: config.toolboxes.dev.mcpServers.api.env.API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

### Security Best Practices

- **Never commit** configuration files with actual credentials
- Use environment variables for all sensitive data (API keys, passwords, tokens)
- Share configuration files in version control with variable references
- Set environment variables in your shell profile or deployment environment
```

**CLAUDE.md Changes**:

Add to "Core Components" section:

```markdown
**src/env-expander.ts** - Environment variable expansion utility
- Implements recursive expansion for configuration values
- Supports `${VAR}` and `${VAR:-default}` syntax
- Throws EnvExpansionError with context for missing variables
- Validates POSIX-compliant variable names
- Integration point: Called by config-loader.ts before Zod validation
```

Update "Configuration as Contract" section:

```markdown
### Environment Variable Expansion

The configuration loader supports environment variable expansion before schema validation:

- Expansion uses `${VAR}` and `${VAR:-default}` syntax (matching Claude Code)
- Works in all configuration fields: command, args, env, url, headers
- Missing required variables fail configuration loading before server starts
- Expanded values are validated against Zod schemas after expansion
- Implementation in src/env-expander.ts, integrated in src/config-loader.ts
```

---

### Step 5: Manual Testing Checklist (45 min)

**Test Scenarios**:

**Positive Tests** (should succeed):
- [ ] Configuration with required variables (all set)
- [ ] Configuration with optional variables (using defaults)
- [ ] Configuration with mixed required and optional variables
- [ ] Multiple variables in single field (`"${HOST}:${PORT}"`)
- [ ] Environment variable with special characters (`p@$$w0rd!`)
- [ ] Empty string environment variable (`export VAR=""`)
- [ ] Configuration without any environment variables (backward compatibility)

**Negative Tests** (should fail with clear errors):
- [ ] Missing required variable (no default)
- [ ] Malformed syntax (`${VAR` without closing brace)
- [ ] Invalid variable name (`${123VAR}`, `${my-var}`)
- [ ] Wrong separator (`${VAR:default}` instead of `${VAR:-default}`)

**Edge Cases**:
- [ ] Multi-line environment variable values
- [ ] Environment variables in object keys (if applicable)
- [ ] Very long environment variable values (> 1KB)
- [ ] Configuration with 10+ environment variable references (performance test)

**Cross-Platform Testing** (if possible):
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test on Windows (if applicable)

**Testing Script**:
```bash
#!/bin/bash
# tests/config-expansion/run-tests.sh

echo "=== Test 1: Basic Expansion ==="
export TEST_VAR="test_value"
export WORKBENCH_CONFIG=tests/config-expansion/test-basic.json
npm run dev &
sleep 2
kill %1

echo "=== Test 2: Default Values ==="
unset LOG_LEVEL
export WORKBENCH_CONFIG=tests/config-expansion/test-defaults.json
npm run dev &
sleep 2
kill %1

echo "=== Test 3: Missing Variable (should fail) ==="
unset MISSING_VAR
export WORKBENCH_CONFIG=tests/config-expansion/test-missing-var.json
npm run dev
# This should fail immediately with error message

echo "=== All tests complete ==="
```

---

### Step 6: Performance Validation (15 min)

**Goal**: Verify configuration loading completes in < 10ms (requirement from spec)

**Benchmark Script**:
```typescript
// benchmark-expansion.ts
import { expandEnvVars } from './src/env-expander.js';

const testConfig = {
  toolboxes: {
    dev: {
      mcpServers: {
        server1: { env: { VAR1: "${VAR1}", VAR2: "${VAR2:-default}" } },
        server2: { env: { VAR3: "${VAR3}", VAR4: "${VAR4:-default}" } },
        // ... add more servers to test scaling
      }
    }
  }
};

process.env.VAR1 = "value1";
process.env.VAR3 = "value3";

const iterations = 1000;
const start = Date.now();

for (let i = 0; i < iterations; i++) {
  expandEnvVars(testConfig);
}

const elapsed = Date.now() - start;
console.log(`Average time per expansion: ${elapsed / iterations}ms`);
// Should be < 10ms (typically < 5ms)
```

**Performance Requirements**:
- [ ] Average expansion time < 10ms for typical config (< 100 fields)
- [ ] No memory leaks (run 1000 iterations, check memory usage)
- [ ] Reasonable scaling (2x fields ≈ 2x time, not exponential)

---

## Verification Checklist

Before marking implementation complete:

**Code Quality**:
- [ ] All new functions have TypeScript type annotations
- [ ] No `any` types used (strict mode compliance)
- [ ] Error messages are clear and actionable
- [ ] Code follows existing workbench patterns (similar to config-loader.ts style)

**Functionality**:
- [ ] All required test scenarios pass
- [ ] Backward compatibility verified (configs without env vars work)
- [ ] Error handling tested (missing vars, malformed syntax)
- [ ] Edge cases handled (empty strings, special chars, multi-line)

**Documentation**:
- [ ] README.md updated with env var examples
- [ ] CLAUDE.md updated with architecture details
- [ ] Code comments added for complex logic (regex pattern, recursive expansion)
- [ ] Example configurations provided in tests/ directory

**Performance**:
- [ ] Expansion completes in < 10ms for typical configs
- [ ] No memory leaks observed
- [ ] Reasonable scaling behavior

**Constitution Compliance**:
- [ ] No changes to meta-tools or tool naming
- [ ] Configuration schema validation still works (Zod)
- [ ] Fail-fast error handling implemented
- [ ] Documentation updated per constitution requirements

---

## Common Issues and Solutions

### Issue 1: Regex Not Matching Variables

**Symptom**: Environment variables are not being expanded.

**Solution**: Check regex pattern and ensure variable names are uppercase with underscores only:
```typescript
const ENV_VAR_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g;
```

### Issue 2: Empty Strings Treated as Unset

**Symptom**: `export VAR=""` uses default instead of empty string.

**Solution**: Use `process.env[name] !== undefined` instead of `!process.env[name]`:
```typescript
const envValue = process.env[varName];
if (envValue !== undefined) {
  return envValue;  // Even if empty string
}
```

### Issue 3: Error Messages Missing Context

**Symptom**: Users can't identify where in config the error occurred.

**Solution**: Always pass jsonPath through recursive calls:
```typescript
expandEnvVars(obj[key], `${jsonPath}.${key}`)
```

### Issue 4: Malformed Syntax Not Caught

**Symptom**: `${VAR` without closing brace doesn't throw error.

**Solution**: Check for unclosed braces after regex replacement:
```typescript
if (str.includes('${') && !/\$\{[A-Z_][A-Z0-9_]*(?::-.*)?\}/.test(str)) {
  throw new EnvExpansionError('', jsonPath, 'Malformed syntax: unclosed brace');
}
```

---

## Next Steps After Implementation

Once implementation is complete:

1. **Run `/speckit.tasks`** - Generate task breakdown for implementation
2. **Create Pull Request** - Follow workbench PR template
3. **Code Review** - Verify constitution compliance
4. **Merge to Main** - Follow release workflow
5. **Version Bump** - Update to v0.7.0 (minor version - new feature)
6. **Create Release** - Tag and publish to npm

**Estimated Total Time**: 4-6 hours

**Blocking Dependencies**: None - feature is self-contained

**Success Criteria** (from spec.md):
- Users can share workbench configurations in version control without exposing credentials ✅
- Configuration files work identically across different operating systems ✅
- All supported fields expand environment variables correctly ✅
- Missing variables produce clear, actionable error messages ✅
- Setup time < 5 minutes following documentation ✅

---

## Resources

- **Feature Spec**: [spec.md](spec.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contract**: [contracts/expansion-api.md](contracts/expansion-api.md)
- **Existing Code**: [src/config-loader.ts](../../../src/config-loader.ts)
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code/mcp.md
