# API Contract: Environment Variable Expansion

**Feature**: Environment Variable Expansion in Configuration
**Date**: 2025-10-27
**Purpose**: Define the public interface for environment variable expansion functionality

## Module: env-expander.ts

### Public API

#### Function: expandEnvVars

**Signature**:
```typescript
function expandEnvVars(
  value: unknown,
  jsonPath?: string
): unknown
```

**Purpose**: Recursively expand environment variable references in any value (string, object, array, primitive).

**Parameters**:
- `value` (unknown): The value to expand. Can be:
  - `string`: Expand `${VAR}` patterns
  - `object`: Recursively expand all properties and keys
  - `array`: Recursively expand all elements
  - `primitive` (number, boolean, null): Return unchanged
- `jsonPath` (string, optional): Dot-notation path for error reporting (default: `""`)

**Returns**:
- `unknown`: Expanded value with same structure as input
  - Strings: `${VAR}` patterns replaced with environment variable values or defaults
  - Objects: New object with expanded keys and values
  - Arrays: New array with expanded elements
  - Primitives: Returned unchanged

**Throws**:
- `EnvExpansionError`: When a required environment variable (without default) is not set, or when syntax is malformed

**Behavior**:

1. **String Expansion**:
   ```typescript
   // Input
   expandEnvVars("${API_KEY}")

   // Success (if API_KEY=secret123)
   // → "secret123"

   // Error (if API_KEY not set)
   // → throws EnvExpansionError
   ```

2. **Default Values**:
   ```typescript
   // Input
   expandEnvVars("${LOG_LEVEL:-info}")

   // Success (if LOG_LEVEL=debug)
   // → "debug"

   // Default Used (if LOG_LEVEL not set)
   // → "info"
   ```

3. **Multiple References**:
   ```typescript
   // Input
   expandEnvVars("${HOST}:${PORT}")

   // Success (if HOST=localhost, PORT=3000)
   // → "localhost:3000"
   ```

4. **Nested Structures**:
   ```typescript
   // Input
   expandEnvVars({
     server: {
       host: "${HOST}",
       port: "${PORT:-3000}"
     },
     features: ["${FEATURE_A}", "${FEATURE_B:-disabled}"]
   })

   // Success (if HOST=localhost, FEATURE_A=auth, PORT and FEATURE_B not set)
   // → {
   //     server: { host: "localhost", port: "3000" },
   //     features: ["auth", "disabled"]
   //   }
   ```

5. **Primitives and Non-Strings**:
   ```typescript
   // Numbers, booleans, null pass through unchanged
   expandEnvVars(42)        // → 42
   expandEnvVars(true)      // → true
   expandEnvVars(null)      // → null
   ```

**Performance**:
- Time Complexity: O(n × m) where n = number of values, m = average string length
- Space Complexity: O(n) for expanded object (original object unchanged)
- Typical Performance: < 5ms for standard configurations (< 100 fields)

**Thread Safety**: Not applicable (Node.js single-threaded). `process.env` access is synchronous.

**Idempotency**: Yes - running expansion twice on the same input produces identical output (since first pass already expanded all variables).

---

#### Class: EnvExpansionError

**Signature**:
```typescript
class EnvExpansionError extends Error {
  constructor(
    variable: string,
    jsonPath: string,
    reason: string
  )

  readonly variable: string;
  readonly jsonPath: string;
  readonly reason: string;
}
```

**Purpose**: Structured error for environment variable expansion failures with debugging context.

**Properties**:
- `variable` (string): Name of the environment variable that caused the error
- `jsonPath` (string): Dot-notation path to the field in configuration (e.g., `"config.toolboxes.dev.mcpServers.api.env.API_KEY"`)
- `reason` (string): Specific explanation (e.g., `"Variable is not set"`, `"Malformed syntax: unclosed brace"`)
- `message` (string): Formatted error message with all context and help text
- `name` (string): Always `"EnvExpansionError"`

**Message Format**:
```
Environment variable expansion failed
  Variable: {variable}
  Location: {jsonPath}
  Reason: {reason}

Set the environment variable before starting server:
  export {variable}=value
```

**Example Usage**:
```typescript
try {
  const config = expandEnvVars(rawConfig, "config");
} catch (error) {
  if (error instanceof EnvExpansionError) {
    console.error(error.message);
    console.error(`Failed variable: ${error.variable}`);
    console.error(`Configuration path: ${error.jsonPath}`);
    process.exit(1);
  }
  throw error;
}
```

**Error Scenarios**:

| Scenario | variable | jsonPath | reason |
|----------|----------|----------|--------|
| Missing required | `API_KEY` | `config.toolboxes.dev.mcpServers.api.env.API_KEY` | `Variable is not set` |
| Malformed syntax | `VAR` | `config.toolboxes.dev.mcpServers.api.command` | `Malformed syntax: unclosed brace in ${VAR` |
| Invalid name | `123VAR` | `config.toolboxes.dev.mcpServers.api.args[0]` | `Variable name must start with letter or underscore` |

---

### Internal Implementation Details

#### Regex Pattern

```typescript
const ENV_VAR_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g;
```

**Pattern Breakdown**:
- `\$\{`: Literal `${`
- `([A-Z_][A-Z0-9_]*)`: Capture group 1 - Variable name
  - `[A-Z_]`: Must start with uppercase letter or underscore
  - `[A-Z0-9_]*`: Followed by zero or more uppercase letters, digits, or underscores
- `(?::-(.*?))?`: Capture group 2 - Optional default value (non-capturing group for `:-`)
  - `:-`: Literal default separator
  - `(.*?)`: Non-greedy match for default value (stops at first `}`)
  - `?`: Entire default clause is optional
- `\}`: Literal `}`
- `g`: Global flag - match all occurrences in string

**Matches**:
- `${API_KEY}` → groups: [`API_KEY`, `undefined`]
- `${LOG_LEVEL:-info}` → groups: [`LOG_LEVEL`, `info`]
- `${_PRIVATE}` → groups: [`_PRIVATE`, `undefined`]

**Non-Matches**:
- `${123VAR}` - starts with digit
- `${my-var}` - lowercase and hyphen
- `${VAR` - unclosed brace
- `$VAR` - no braces

#### Validation Logic

```typescript
function validateVariableName(name: string): void {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    if (/^[0-9]/.test(name)) {
      throw new Error("Variable name cannot start with digit");
    }
    throw new Error("Variable name must contain only uppercase letters, digits, and underscores");
  }
}
```

**Validation Rules**:
1. Name must start with uppercase letter or underscore
2. Name can contain uppercase letters, digits, underscores
3. Name cannot be empty (caught by regex)

**Why Uppercase Only?**: Following POSIX shell convention for environment variables. Lowercase variables are typically shell-local, uppercase are environment.

---

### Integration Contract: config-loader.ts

#### Current Flow (Before Feature)

```typescript
export function loadConfig(path: string): WorkbenchConfig {
  const rawConfig = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return validateConfig(rawConfig);  // Zod validation
}
```

#### New Flow (After Feature)

```typescript
import { expandEnvVars, EnvExpansionError } from './env-expander.js';

export function loadConfig(path: string): WorkbenchConfig {
  const rawConfig = JSON.parse(fs.readFileSync(path, 'utf-8'));

  try {
    const expandedConfig = expandEnvVars(rawConfig, 'config');
    return validateConfig(expandedConfig);  // Existing Zod validation
  } catch (error) {
    if (error instanceof EnvExpansionError) {
      // Wrap with config loading context
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
    throw error;
  }
}
```

**Contract Requirements**:
1. Expansion must occur **before** Zod validation
2. Errors must be caught and re-thrown with config file context
3. Original `rawConfig` object may be mutated (or new object returned - implementation detail)
4. Expansion errors prevent server startup (fail-fast)

---

### Test Contract

#### Required Test Cases

**Positive Tests** (must pass):
```typescript
// 1. Basic expansion
assert(expandEnvVars("${TEST_VAR}") === "value")  // when TEST_VAR=value

// 2. Default values
assert(expandEnvVars("${UNSET:-default}") === "default")

// 3. Multiple variables
assert(expandEnvVars("${A}:${B}") === "1:2")  // when A=1, B=2

// 4. Nested objects
const input = { server: { host: "${HOST}" } };
const output = expandEnvVars(input);
assert(output.server.host === "localhost")  // when HOST=localhost

// 5. Arrays
assert(expandEnvVars(["${A}", "${B}"])[0] === "1")

// 6. Primitives unchanged
assert(expandEnvVars(42) === 42)
assert(expandEnvVars(null) === null)

// 7. Empty string is valid
assert(expandEnvVars("${EMPTY}") === "")  // when EMPTY=""
```

**Negative Tests** (must throw EnvExpansionError):
```typescript
// 1. Missing required variable
expandEnvVars("${MISSING}")  // throws if MISSING not set

// 2. Malformed syntax
expandEnvVars("${VAR")  // unclosed brace

// 3. Invalid variable name
expandEnvVars("${123VAR}")  // starts with digit

// 4. Wrong separator
expandEnvVars("${VAR:default}")  // should be :-
```

**Edge Case Tests**:
```typescript
// 1. Special characters in values
process.env.SPECIAL = "p@$$w0rd!";
assert(expandEnvVars("${SPECIAL}") === "p@$$w0rd!")

// 2. Multi-line values
process.env.CERT = "line1\nline2";
assert(expandEnvVars("${CERT}").includes("\n"))

// 3. Empty vs unset
process.env.EMPTY = "";
delete process.env.UNSET;
assert(expandEnvVars("${EMPTY}") === "")
assert(expandEnvVars("${UNSET:-default}") === "default")
```

---

### Backward Compatibility Contract

**Requirement**: Existing configurations without environment variables must continue working.

**Test**:
```typescript
const configWithoutEnvVars = {
  toolboxes: {
    dev: {
      mcpServers: {
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
        }
      }
    }
  }
};

const result = expandEnvVars(configWithoutEnvVars);
assert.deepEqual(result, configWithoutEnvVars);  // Must be unchanged
```

**Guarantee**: Strings without `${...}` patterns are returned unchanged.

---

## Error Handling Contract

### Error Propagation

```typescript
loadConfig()
  └─> expandEnvVars()
        ├─> Success → validateConfig() (Zod)
        └─> EnvExpansionError → Re-throw with context → Server startup fails
```

### Error Context Requirements

All errors must include:
1. **Variable name**: Which environment variable caused the issue
2. **JSON path**: Where in the configuration the error occurred
3. **Reason**: Specific explanation (not set, malformed, invalid name)
4. **Help text**: How to resolve (export command example)

### Example Error Output

```
Configuration loading failed: Environment variable expansion failed
  Variable: API_KEY
  Location: config.toolboxes.dev.mcpServers.api.env.API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

---

## Performance Contract

**Requirements**:
- Expansion must complete in < 10ms for typical configurations
- No memory leaks (objects should be garbage collected)
- No external I/O (environment variables read from `process.env` only)

**Typical Configuration Profile**:
- ~50-100 configuration fields
- ~5-10 environment variable references
- ~2-3 levels of nesting

**Expected Performance**:
- Time: < 5ms (50% of budget)
- Memory: < 100KB overhead (negligible)

---

## Summary

The environment variable expansion API provides:

1. **Core Function**: `expandEnvVars(value, jsonPath)` - Recursive expansion of any value
2. **Error Class**: `EnvExpansionError` - Structured error with context
3. **Integration Point**: config-loader.ts (expansion before validation)
4. **Backward Compatibility**: Configs without env vars work unchanged
5. **Performance**: < 10ms for typical configs

The contract ensures:
- Clear error messages with debugging context
- Fail-fast behavior on missing required variables
- Type safety with TypeScript strict mode
- Comprehensive test coverage for edge cases
