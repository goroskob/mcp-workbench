# Test Procedure: US1 - Secure Credential Management

**Test Configuration**: `test-us1-credentials.json`
**User Story**: US1 - Secure Credentials (Priority P1)
**Tasks**: T011-T017

## Purpose

Verify that environment variable expansion works for secure credentials using `${VAR}` syntax in:
- `env` object values (T013)
- `command` field (T014)
- `args` array (T015)
- Error handling for missing variables (T016)
- Multiple variables in single config (T017)

## Test Scenarios

### Scenario 1: Expansion in env Object (T013)

**Given**: Configuration has `${API_KEY}` in env field
**When**: API_KEY environment variable is set to "secret123"
**Then**: The downstream MCP server receives "secret123" as the API_KEY value

**Test Steps**:
```bash
export API_KEY="secret123"
export DATABASE_PASSWORD="db_password_456"
export AUTH_TOKEN="token_789"
export WORKBENCH_CONFIG=tests/config-expansion/test-us1-credentials.json
npm run build
npm start
```

**Expected**: Server starts successfully, environment variables are expanded

### Scenario 2: Expansion in args Array (T015)

**Given**: Configuration has `${DATABASE_PASSWORD}` in args field
**When**: DATABASE_PASSWORD is set
**Then**: Server command is executed with password substituted correctly

**Verification**: Check that args array contains actual password value, not literal string

### Scenario 3: Multiple Variables in Single Config (T017)

**Given**: Multiple environment variables used (API_KEY, DATABASE_PASSWORD, AUTH_TOKEN)
**When**: All variables are set
**Then**: All values are substituted correctly throughout the configuration

**Verification**: All three variables expand successfully

### Scenario 4: Error When Required Variable Missing (T016)

**Given**: Configuration has `${API_KEY}` but API_KEY is not set
**When**: Server attempts to start
**Then**: Clear error message with variable name and location

**Test Steps**:
```bash
unset API_KEY
export DATABASE_PASSWORD="db_pass"
export AUTH_TOKEN="token"
export WORKBENCH_CONFIG=tests/config-expansion/test-us1-credentials.json
npm start
```

**Expected Error Message**:
```
Failed to load configuration from tests/config-expansion/test-us1-credentials.json:
Environment variable expansion failed
  Variable: API_KEY
  Location: config.toolboxes.test-credentials.mcpServers.memory-server.env.API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

## Acceptance Criteria

- ✅ `${API_KEY}` expands correctly in env field (T013)
- ✅ `${DATABASE_PASSWORD}` expands correctly in command field (T014)
- ✅ `${DATABASE_PASSWORD}` expands correctly in args array (T015)
- ✅ `${AUTH_TOKEN}` expands correctly in env field (T013)
- ✅ Multiple variables in single config all expand (T017)
- ✅ Missing required variable produces clear error with variable name and JSON path (T016)
- ✅ Error message includes resolution guidance (export command)

## Manual Test Results

Run these commands to verify:

```bash
# Test 1: All variables set (should succeed)
export API_KEY="test_key_123"
export DATABASE_PASSWORD="test_pass_456"
export AUTH_TOKEN="test_token_789"
export WORKBENCH_CONFIG=tests/config-expansion/test-us1-credentials.json
npm run build
npm start
# Expected: Server starts, variables expanded

# Test 2: Missing variable (should fail with clear error)
unset API_KEY
npm start
# Expected: Error message with API_KEY location and help text
```

## Notes

- Credentials are never exposed in configuration file
- Configuration can be safely committed to version control
- Each developer sets their own environment variables
- Error messages provide exact location and resolution steps
- Supports all config fields: env, command, args
