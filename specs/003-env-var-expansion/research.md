# Research: Environment Variable Expansion

**Feature**: Environment Variable Expansion in Configuration
**Date**: 2025-10-27
**Purpose**: Research implementation approaches, best practices, and design decisions

## Research Questions

### 1. How does Claude Code implement environment variable expansion?

**Context**: The feature spec explicitly requires matching Claude Code's implementation for consistency across the MCP ecosystem.

**Findings from Documentation**:
- Supports two syntax patterns: `${VAR}` and `${VAR:-default}`
- Works in multiple configuration fields: `command`, `args`, `env`, `url`, `headers`
- Fails parsing if required variable (without default) is not set
- Designed for team configuration sharing (version control + externalized secrets)

**Key Characteristics**:
1. **POSIX-style expansion**: Uses shell-like syntax but implemented in application code
2. **Fail-fast validation**: Missing required variables prevent config parsing
3. **Field-agnostic**: Works across different JSON field types (strings, arrays, objects)
4. **No recursive expansion**: Variables don't reference other variables

**Decision**: Implement identical syntax and behavior to ensure MCP ecosystem consistency.

**Rationale**: Users expect uniform behavior across MCP tools. Diverging from Claude Code would create confusion and compatibility issues.

---

### 2. What are best practices for environment variable expansion in TypeScript/Node.js?

**Research Approach**: Examined common patterns in TypeScript configuration libraries and Node.js tooling.

**Patterns Evaluated**:

1. **Regular Expression Approach**
   - **How**: Use regex to find `${...}` patterns, replace with `process.env` values
   - **Pros**: Simple, no dependencies, fast for small configs
   - **Cons**: Complex regex for nested structures, error handling scattered
   - **Example**: `str.replace(/\$\{([^}:-]+)(?::-(.*))?\}/g, replacer)`

2. **Recursive Object Walker**
   - **How**: Traverse JSON object tree, expand strings in-place
   - **Pros**: Handles nested objects/arrays naturally, centralized error handling
   - **Cons**: Slightly more code, mutates objects
   - **Example**: Used by Docker Compose, Kubernetes config tools

3. **Two-Pass Processing**
   - **How**: First pass collects variables, second pass validates, third expands
   - **Pros**: Clear separation of concerns, better error messages
   - **Cons**: Multiple iterations, more overhead
   - **Example**: Common in enterprise config management tools

**Decision**: Use **Recursive Object Walker** with single-pass expansion.

**Rationale**:
- Matches workbench config structure (nested toolboxes → servers → fields)
- Enables precise error messages with JSON path context
- Minimal performance overhead for typical configs (< 10ms requirement)
- Clear code organization (one expansion function handles all field types)

**Alternatives Considered**:
- Simple regex: Rejected - too complex for nested objects, poor error context
- Two-pass: Rejected - unnecessary overhead for config loading use case

---

### 3. How should errors be reported for missing or malformed variables?

**Research Question**: What error information helps users debug configuration issues most effectively?

**Error Scenarios**:
1. Missing required variable: `${API_KEY}` but API_KEY not set
2. Malformed syntax: `${VAR` (unclosed brace), `${VAR:default}` (wrong separator)
3. Partial expansion: Some variables set, others missing
4. Invalid expanded values: Variable expands to value that fails schema validation

**Best Practices from Node.js Ecosystem**:

**Error Message Structure** (from dotenv, config libraries):
```
[CONTEXT] Error message with specific details
  Variable: ${VARIABLE_NAME}
  Location: path.to.field
  Reason: Variable is not set (or: malformed syntax)
  Help: Set environment variable before starting server
```

**Decision**: Implement structured error reporting with context.

**Error Format**:
```typescript
class EnvExpansionError extends Error {
  constructor(
    variable: string,
    jsonPath: string,
    reason: string
  ) {
    super(`Environment variable expansion failed
  Variable: ${variable}
  Location: ${jsonPath}
  Reason: ${reason}

Set the environment variable before starting the server:
  export ${variable}=value`);
  }
}
```

**Rationale**:
- JSON path (e.g., `toolboxes.dev.mcpServers.myserver.env.API_KEY`) helps locate issue
- Variable name enables quick fix (set the variable)
- Reason explains what's wrong (not set vs. malformed vs. invalid)
- Help text guides resolution

**Alternatives Considered**:
- Generic errors: Rejected - users can't debug without context
- Silent failures with defaults: Rejected - violates fail-fast principle

---

### 4. How to handle edge cases (special characters, multi-line values, empty strings)?

**Edge Cases Identified**:

1. **Special characters in values**
   - Example: `PASSWORD='p@$$w0rd!'`, `PATH=/usr/local/bin:/usr/bin`
   - Solution: No escaping needed - env vars are already strings, copy verbatim

2. **Multi-line values**
   - Example: `CERTIFICATE="-----BEGIN CERTIFICATE-----\nMII..."`
   - Solution: JSON handles escaped newlines; env var value is literal string

3. **Empty strings vs. unset**
   - Example: `export VAR=""` vs. `unset VAR`
   - Solution: Empty string (`""`) is valid value; unset triggers default or error

4. **Multiple variables in single field**
   - Example: `"${HOST}:${PORT}"` → `"localhost:3000"`
   - Solution: Regex expansion handles multiple replacements naturally

5. **Variable names with special chars**
   - Example: `${MY_VAR_123}` (valid), `${MY-VAR}` (invalid in most shells)
   - Solution: Accept alphanumeric + underscore (POSIX variable naming)

**Decision Matrix**:

| Edge Case | Behavior | Rationale |
|-----------|----------|-----------|
| Special chars in value | Copy verbatim | Env vars are already strings, no escaping needed |
| Multi-line values | Support natively | JSON handles escapes, pass through to config |
| Empty string | Treat as valid value | Empty ≠ unset; both are meaningful states |
| Unset variable | Use default or error | POSIX shell semantics |
| Multiple vars per field | Expand all | Natural regex replacement behavior |
| Invalid var names | Error with clear message | Prevent subtle bugs from typos |

**Implementation Notes**:
- Regex pattern: `/\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g`
  - `[A-Z_][A-Z0-9_]*`: POSIX variable naming (start with letter/underscore)
  - `(?::-(.*?))?`: Optional default with non-greedy match
- Empty string check: `process.env[name] !== undefined` (distinguishes unset from empty)

---

### 5. Should expansion be inlined in config-loader.ts or extracted to separate module?

**Architectural Decision**: Where should the expansion logic live?

**Option A: Inline in config-loader.ts**
- **Pros**:
  - All config logic in one place
  - No new files to maintain
  - Simpler import structure
- **Cons**:
  - config-loader.ts becomes longer (but only by ~50 lines)
  - Harder to unit test expansion logic in isolation
  - Mixing concerns (validation + expansion)

**Option B: Separate env-expander.ts module**
- **Pros**:
  - Single Responsibility Principle (separation of concerns)
  - Easier to unit test expansion in isolation
  - Reusable if expansion needed elsewhere
  - Clearer code organization
- **Cons**:
  - Extra file to maintain
  - Additional import overhead (minimal)

**Decision**: **Create separate env-expander.ts module**.

**Rationale**:
- Expansion is self-contained functionality (~100 lines including tests)
- Easier to test edge cases in isolation
- Follows workbench pattern (config-loader.ts, client-manager.ts, types.ts - each has single responsibility)
- Potential future use: Expansion might be useful for runtime config updates

**Module Interface**:
```typescript
// env-expander.ts
export function expandEnvVars(
  value: unknown,
  jsonPath: string = ""
): unknown {
  // Recursively expand environment variables in any value type
  // Throws EnvExpansionError on missing required variables
}

export class EnvExpansionError extends Error {
  constructor(
    public readonly variable: string,
    public readonly jsonPath: string,
    public readonly reason: string
  ) { ... }
}
```

**Integration Point**:
```typescript
// config-loader.ts
import { expandEnvVars } from './env-expander.js';

export function loadConfig(path: string): WorkbenchConfig {
  const rawConfig = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const expandedConfig = expandEnvVars(rawConfig, 'config'); // Expand before validation
  return validateConfig(expandedConfig); // Existing Zod validation
}
```

---

## Design Decisions Summary

### 1. Syntax and Behavior
- **Syntax**: `${VAR}` and `${VAR:-default}` (matching Claude Code exactly)
- **Supported Fields**: `command`, `args`, `env`, `url`, `headers` (all config fields)
- **Validation**: Fail-fast on missing required variables before Zod validation

### 2. Implementation Approach
- **Pattern**: Recursive object walker with single-pass expansion
- **Module**: Separate env-expander.ts for clean separation of concerns
- **Error Handling**: Structured errors with JSON path, variable name, and reason

### 3. Edge Case Handling
- **Empty strings**: Treated as valid values (distinct from unset)
- **Special characters**: Copied verbatim (no escaping needed)
- **Multi-line values**: Supported natively via JSON escaping
- **Multiple variables per field**: All expanded in single pass
- **Variable naming**: POSIX-compliant (alphanumeric + underscore only)

### 4. Error Reporting
- **Format**: Structured errors with context (variable, JSON path, reason, help text)
- **Timing**: Fail-fast during config loading, before server starts
- **User Guidance**: Error messages include resolution steps

### 5. Testing Strategy
- **Unit Tests**: Test expansion logic in isolation (via manual test configs)
- **Integration Tests**: Test with real workbench configurations
- **Edge Cases**: Comprehensive test matrix for all edge cases
- **Backward Compatibility**: Verify existing configs without env vars still work

---

## Implementation Checklist

- [ ] Create env-expander.ts with expansion logic
- [ ] Add EnvExpansionError class with context fields
- [ ] Implement recursive expansion function
- [ ] Handle ${VAR} syntax (required variables)
- [ ] Handle ${VAR:-default} syntax (optional with fallback)
- [ ] Validate variable names (POSIX-compliant)
- [ ] Distinguish empty string from unset variables
- [ ] Support multiple variables in single field
- [ ] Provide clear error messages with JSON path context
- [ ] Integrate expansion in config-loader.ts (before Zod validation)
- [ ] Test backward compatibility (configs without env vars)
- [ ] Test all edge cases (special chars, multi-line, empty strings)
- [ ] Create test configurations for manual testing
- [ ] Update README.md with env var syntax examples
- [ ] Update CLAUDE.md with expansion architecture
- [ ] Verify performance < 10ms for typical configs

---

## References

- **Claude Code MCP Docs**: https://docs.claude.com/en/docs/claude-code/mcp.md (environment variable expansion section)
- **POSIX Variable Naming**: Alphanumeric + underscore, cannot start with digit
- **Similar Implementations**: Docker Compose, Kubernetes ConfigMaps, dotenv libraries
- **TypeScript Best Practices**: Strict typing, explicit error classes, single responsibility

---

## Open Questions (Resolved)

~~1. Should we support recursive expansion (`${VAR}` contains another `${INNER}`)?~~
   - **Answer**: No - Claude Code doesn't support it, adds complexity, security risk

~~2. Should defaults support expressions (e.g., `${PORT:-$((3000+1))}`)?~~
   - **Answer**: No - only literal default values, no shell evaluation

~~3. Should we support escaping (e.g., `\${NOT_A_VAR}`)?~~
   - **Answer**: Not in v1 - wait for user feedback to avoid over-engineering

All research complete. Ready for Phase 1 (data model and contracts).
