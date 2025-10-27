# Data Model: Environment Variable Expansion

**Feature**: Environment Variable Expansion in Configuration
**Date**: 2025-10-27
**Purpose**: Define data structures, validation rules, and state transitions

## Overview

This feature introduces environment variable expansion to the workbench configuration loading process. The data model is minimal since this is a preprocessing step that operates on existing configuration structures.

## Core Entities

### 1. Environment Variable Reference

**Description**: A placeholder in the configuration that will be replaced with an environment variable value.

**Syntax Variants**:
- **Required Variable**: `${VARIABLE_NAME}` - Must be set or expansion fails
- **Optional Variable with Default**: `${VARIABLE_NAME:-default_value}` - Uses default if variable is not set

**Attributes**:
- `variableName` (string): Name of the environment variable (POSIX-compliant)
- `defaultValue` (string | undefined): Optional fallback value
- `jsonPath` (string): Location in configuration where reference appears (for error reporting)

**Validation Rules**:
1. Variable name MUST match pattern: `[A-Z_][A-Z0-9_]*` (POSIX variable naming)
2. Variable name MUST NOT be empty
3. Default value MUST NOT contain unmatched braces `{` or `}`
4. Syntax MUST be well-formed: `${` followed by variable name, optional `:-default`, then `}`

**Invalid Examples**:
- `${123VAR}` - Cannot start with digit
- `${MY-VAR}` - Hyphens not allowed (use underscore)
- `${VAR` - Unclosed brace
- `${VAR:default}` - Wrong separator (should be `:-`)
- `${}` - Empty variable name

**Valid Examples**:
- `${API_KEY}` - Required variable
- `${LOG_LEVEL:-info}` - Optional with default
- `${DB_HOST}` - Required variable
- `${PORT:-3000}` - Optional with numeric default (stored as string)

---

### 2. Expansion Result

**Description**: The outcome of attempting to expand an environment variable reference.

**States**:
1. **Success**: Variable expanded to a value
2. **Default Used**: Variable not set, default value used
3. **Error**: Required variable not set (no default)
4. **Malformed**: Syntax error in reference

**Attributes for Success/Default**:
- `originalReference` (string): The `${...}` pattern that was replaced
- `expandedValue` (string): The final value after expansion
- `source` (enum): `"environment" | "default"`

**Attributes for Error**:
- `variableName` (string): Name of the variable that caused error
- `jsonPath` (string): Location in config where error occurred
- `errorType` (enum): `"missing_required" | "malformed_syntax" | "invalid_name"`
- `message` (string): Human-readable error description

**State Transitions**:
```
Input: "${VAR}"
  ├─> Variable set in environment → Success (source: environment)
  └─> Variable not set → Error (type: missing_required)

Input: "${VAR:-default}"
  ├─> Variable set in environment → Success (source: environment)
  └─> Variable not set → Default Used (source: default)

Input: "${VAR" (malformed)
  └─> Always → Error (type: malformed_syntax)

Input: "${123VAR}"
  └─> Always → Error (type: invalid_name)
```

---

### 3. Expansion Error

**Description**: An error that occurs during environment variable expansion, preventing configuration loading.

**Attributes**:
- `variable` (string): Name of the environment variable involved
- `jsonPath` (string): Dot-notation path to the field in configuration (e.g., `"toolboxes.dev.mcpServers.myserver.env.API_KEY"`)
- `reason` (string): Specific explanation of what went wrong
- `help` (string): Guidance for resolving the issue

**Error Types**:

| Type | Variable | Reason | Help |
|------|----------|--------|------|
| Missing Required | `API_KEY` | Variable is not set | Set the environment variable before starting server |
| Malformed Syntax | `VAR` | Unclosed brace in `${VAR` | Check configuration syntax: `${VARIABLE}` or `${VARIABLE:-default}` |
| Invalid Name | `123VAR` | Variable name cannot start with digit | Use POSIX-compliant names: `[A-Z_][A-Z0-9_]*` |

**Example Error Object**:
```typescript
{
  variable: "API_KEY",
  jsonPath: "toolboxes.dev.mcpServers.myserver.env.API_KEY",
  reason: "Variable is not set",
  help: "Set the environment variable before starting server:\n  export API_KEY=value"
}
```

**Rendering**:
```
Environment variable expansion failed
  Variable: API_KEY
  Location: toolboxes.dev.mcpServers.myserver.env.API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

---

## Data Flow

### Configuration Loading with Expansion

```
1. Load JSON file
   ↓
2. Parse JSON to object (existing)
   ↓
3. **[NEW]** Expand environment variables recursively
   ├─> Success: Continue to validation
   └─> Error: Throw EnvExpansionError, halt startup
   ↓
4. Validate with Zod schemas (existing)
   ↓
5. Return WorkbenchConfig (existing)
```

**Key Point**: Expansion happens **before** Zod validation. This ensures:
- Expanded values are validated against schema
- Type mismatches caught after expansion (e.g., port number as string)
- Error messages reference expanded values, not variables

### Recursive Expansion Algorithm

```typescript
function expandEnvVars(value: unknown, jsonPath: string): unknown {
  // Base cases
  if (typeof value === 'string') {
    return expandString(value, jsonPath);  // Replace ${...} patterns
  }
  if (value === null || typeof value !== 'object') {
    return value;  // Primitives pass through unchanged
  }

  // Recursive cases
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      expandEnvVars(item, `${jsonPath}[${index}]`)
    );
  }

  // Object case
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const expandedKey = expandString(key, `${jsonPath}.${key}`);  // Keys can have env vars too
    result[expandedKey] = expandEnvVars(val, `${jsonPath}.${key}`);
  }
  return result;
}

function expandString(str: string, jsonPath: string): string {
  return str.replace(
    /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g,
    (match, varName, defaultValue) => {
      const envValue = process.env[varName];

      if (envValue !== undefined) {
        return envValue;  // Variable is set (even if empty string)
      }

      if (defaultValue !== undefined) {
        return defaultValue;  // Use default for unset variable
      }

      // Required variable is missing
      throw new EnvExpansionError(varName, jsonPath, "Variable is not set");
    }
  );
}
```

**Data Invariants**:
1. Input configuration structure is preserved (object tree shape unchanged)
2. Only string values and string keys are modified (primitives and structure unchanged)
3. Multiple references in single string are all expanded (or all fail)
4. Expansion is idempotent (running twice produces same result, since variables already expanded)

---

## Schema Integration

### Existing Configuration Schema (Unchanged)

The feature does not modify the WorkbenchConfig schema. Expansion produces the same structure as if the user had written literal values.

**Example Transformation**:

**Input (with env vars)**:
```json
{
  "toolboxes": {
    "dev": {
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["${PROJECT_ROOT}/server.js"],
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

**After Expansion** (assuming `PROJECT_ROOT=/home/user/project`, `API_KEY=secret123`, `LOG_LEVEL` not set):
```json
{
  "toolboxes": {
    "dev": {
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["/home/user/project/server.js"],
          "env": {
            "API_KEY": "secret123",
            "LOG_LEVEL": "info"
          }
        }
      }
    }
  }
}
```

This expanded configuration then passes through existing Zod validation unchanged.

---

## Edge Cases and Validation

### 1. Empty String vs. Unset Variable

**Behavior**:
```typescript
// Setup
process.env.SET_EMPTY = "";
// process.env.UNSET_VAR is undefined

// Results
"${SET_EMPTY}"           → ""      (empty string is valid)
"${SET_EMPTY:-default}"  → ""      (environment takes precedence)
"${UNSET_VAR}"           → Error   (required variable missing)
"${UNSET_VAR:-default}"  → "default"
```

**Rationale**: Empty strings and unset variables are semantically different. Users can intentionally set empty values.

### 2. Multiple Variables in Single Field

**Example**:
```json
{
  "url": "${PROTOCOL}://${HOST}:${PORT}/api"
}
```

**Expansion** (with `PROTOCOL=https`, `HOST=api.example.com`, `PORT=443`):
```json
{
  "url": "https://api.example.com:443/api"
}
```

**Error Handling**: If any variable is missing, the entire field expansion fails with error for the first missing variable.

### 3. Special Characters in Values

**No Escaping Needed**:
```bash
export PASSWORD='p@$$w0rd!'
export PATH='/usr/local/bin:/usr/bin'
export JSON='{"key":"value"}'
```

All values are copied verbatim - environment variables are already strings, no shell interpretation occurs.

### 4. Multi-line Values

**Support via JSON Escaping**:
```bash
export CERTIFICATE="-----BEGIN CERTIFICATE-----\nMII...\n-----END CERTIFICATE-----"
```

```json
{
  "env": {
    "CERT": "${CERTIFICATE}"
  }
}
```

Expands to:
```json
{
  "env": {
    "CERT": "-----BEGIN CERTIFICATE-----\nMII...\n-----END CERTIFICATE-----"
  }
}
```

The `\n` is a JSON escape sequence, handled by JSON parser.

---

## Type Definitions

### TypeScript Interfaces

```typescript
/**
 * Error thrown when environment variable expansion fails.
 * Includes context for debugging: variable name, location, and resolution guidance.
 */
export class EnvExpansionError extends Error {
  constructor(
    public readonly variable: string,
    public readonly jsonPath: string,
    public readonly reason: string
  ) {
    const help = `Set the environment variable before starting server:\n  export ${variable}=value`;
    super(`Environment variable expansion failed
  Variable: ${variable}
  Location: ${jsonPath}
  Reason: ${reason}

${help}`);
    this.name = 'EnvExpansionError';
  }
}

/**
 * Result of parsing an environment variable reference.
 * Internal type used during expansion.
 */
interface ParsedReference {
  fullMatch: string;        // e.g., "${API_KEY}" or "${PORT:-3000}"
  variableName: string;     // e.g., "API_KEY"
  defaultValue?: string;    // e.g., "3000" (undefined if no default)
}

/**
 * Validation result for variable name.
 */
interface VariableNameValidation {
  valid: boolean;
  error?: string;  // e.g., "Variable name cannot start with digit"
}
```

---

## Validation Rules Summary

### Variable Name Validation
- ✅ **Valid**: `API_KEY`, `LOG_LEVEL`, `_PRIVATE`, `VAR123`
- ❌ **Invalid**: `123VAR` (starts with digit), `MY-VAR` (hyphen), `my-var` (lowercase - convention)

### Syntax Validation
- ✅ **Valid**: `${VAR}`, `${VAR:-default}`, `prefix-${VAR}-suffix`
- ❌ **Invalid**: `${VAR` (unclosed), `${VAR:default}` (wrong separator), `$VAR` (no braces)

### Value Validation (Post-Expansion)
- Expanded values must pass existing Zod schema validation
- Type mismatches caught after expansion (e.g., non-numeric port)
- Invalid paths/URLs caught by schema, not expansion logic

---

## Dependencies

**No New Dependencies Required**:
- Use built-in `process.env` for environment variable access
- Use standard `String.replace()` with regex for pattern matching
- Use existing error handling patterns from config-loader.ts

**External Data Sources**:
- `process.env`: Read-only access to environment variables (provided by Node.js runtime)

---

## Performance Considerations

**Complexity**:
- Time: O(n × m) where n = config size (JSON nodes), m = average string length
- Space: O(n) for cloned/expanded configuration object

**Optimization**:
- Single-pass recursive traversal (no multiple iterations)
- Regex compiled once per string (not per match)
- Early exit on errors (fail-fast)

**Benchmarks** (typical configuration):
- Config size: ~100 fields, ~10 env var references
- Expected time: < 5ms (well under 10ms requirement)
- Memory overhead: Negligible (config object is small, <1KB)

---

## Summary

This data model defines three core entities:
1. **Environment Variable Reference**: Parsed from `${VAR}` or `${VAR:-default}` syntax
2. **Expansion Result**: Success, default used, or error state
3. **Expansion Error**: Structured error with context for debugging

The expansion process is a preprocessing step that operates on the raw configuration object before Zod validation, preserving the existing schema and validation logic while enabling dynamic configuration values.
