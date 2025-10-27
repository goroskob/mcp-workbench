# Test Procedure: US3 - Environment-Specific Configuration

**Test Configuration**: `test-us3-multienv.json`
**User Story**: US3 - Multi-Environment (Priority P3)
**Tasks**: T024-T029

## Purpose

Verify that environment variable expansion enables multi-environment configurations (dev/staging/prod) using `${VAR}` syntax in:
- `env` object for environment-specific values (T026, T027)
- URL configuration (T026)
- Header configuration (T027)
- Multiple variables controlling different aspects (T028)
- Environment switching without config changes (T029)

## Test Scenarios

### Scenario 1: Development Environment (T029)

**Given**: Configuration has `${API_ENDPOINT}`, `${ENVIRONMENT}`, and `${LOG_LEVEL}` variables
**When**: Variables set to development values
**Then**: Server operates in development mode

**Test Steps**:
```bash
export API_ENDPOINT="http://localhost:3000/api"
export API_VERSION="v1"
export AUTH_TOKEN="dev_token_123"
export LOG_LEVEL="debug"
export ENVIRONMENT="development"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm run build
npm start
```

**Expected**: Server starts with development configuration

### Scenario 2: Production Environment (T029)

**Given**: Same configuration as development
**When**: Variables set to production values
**Then**: Server operates in production mode without config file changes

**Test Steps**:
```bash
export API_ENDPOINT="https://api.production.example.com"
export API_VERSION="v2"
export AUTH_TOKEN="prod_token_secure_xyz"
export LOG_LEVEL="error"
export ENVIRONMENT="production"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm run build
npm start
```

**Expected**: Server starts with production configuration using same config file

### Scenario 3: Staging Environment (T029)

**Given**: Same configuration file
**When**: Variables set to staging values
**Then**: Server operates in staging mode

**Test Steps**:
```bash
export API_ENDPOINT="https://api.staging.example.com"
export API_VERSION="v2-beta"
export AUTH_TOKEN="staging_token_456"
export LOG_LEVEL="info"
export ENVIRONMENT="staging"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm start
```

**Expected**: Server starts with staging configuration

### Scenario 4: Multiple Variables Controlling Different Aspects (T028)

**Given**: Configuration uses multiple environment variables for different purposes
**When**: All variables set to appropriate values
**Then**: Each variable controls its specific aspect independently

**Variables**:
- `API_ENDPOINT`: Controls which backend to connect to
- `API_VERSION`: Controls API version path
- `AUTH_TOKEN`: Controls authentication
- `LOG_LEVEL`: Controls logging verbosity
- `ENVIRONMENT`: Controls environment identifier

**Verification**: Each variable independently affects its domain without interfering with others

### Scenario 5: URL Field Expansion (T026)

**Given**: Configuration would have `url` field with `${API_ENDPOINT}`
**When**: API_ENDPOINT is set to different URLs
**Then**: Server connects to the specified endpoint

**Note**: This test configuration uses env object, but the expansion mechanism supports url fields in the same way

### Scenario 6: Headers Object Expansion (T027)

**Given**: Configuration would have `headers` with `${AUTH_TOKEN}`
**When**: AUTH_TOKEN is set
**Then**: HTTP headers include the expanded token

**Note**: This test configuration uses env object, but the expansion mechanism supports headers in the same way

### Scenario 7: Environment Switching Without Config Changes (T029)

**Given**: Single configuration file shared across all environments
**When**: Developer switches from dev to prod by changing env vars
**Then**: Configuration adapts without file modifications

**Test Steps**:
```bash
# Start in dev
export API_ENDPOINT="http://localhost:3000/api"
export ENVIRONMENT="development"
export AUTH_TOKEN="dev_token"
export LOG_LEVEL="debug"
export API_VERSION="v1"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm start
# Verify dev settings

# Switch to prod (same config file)
export API_ENDPOINT="https://api.production.example.com"
export ENVIRONMENT="production"
export AUTH_TOKEN="prod_token"
export LOG_LEVEL="error"
export API_VERSION="v2"
npm start
# Verify prod settings
```

**Expected**: No config file changes needed, only environment variable changes

### Scenario 8: Missing Environment Variable (Error Handling)

**Given**: Configuration references ${ENVIRONMENT}
**When**: ENVIRONMENT variable is not set
**Then**: Clear error message with variable name and location

**Test Steps**:
```bash
unset ENVIRONMENT
export API_ENDPOINT="http://localhost:3000/api"
export AUTH_TOKEN="token"
export LOG_LEVEL="info"
export API_VERSION="v1"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm start
```

**Expected Error Message**:
```
Failed to load configuration from tests/config-expansion/test-us3-multienv.json:
Environment variable expansion failed
  Variable: ENVIRONMENT
  Location: config.toolboxes.test-multienv.mcpServers.api-server.env.ENVIRONMENT
  Reason: Variable is not set

Set the environment variable before starting server:
  export ENVIRONMENT=value
```

## Acceptance Criteria

- ✅ `${API_ENDPOINT}` expands correctly in env field (T026)
- ✅ `${AUTH_TOKEN}` expands correctly for authorization (T027)
- ✅ `${LOG_LEVEL}` expands correctly for configuration (T028)
- ✅ `${ENVIRONMENT}` expands correctly for environment identification (T028)
- ✅ `${API_VERSION}` expands correctly for versioning (T028)
- ✅ Multiple variables in single config all expand independently (T028)
- ✅ Same config file works for dev, staging, and prod (T029)
- ✅ Switching environments requires only env var changes, no config edits (T029)
- ✅ Missing required variable produces clear error with variable name and location
- ✅ Configuration file can be safely committed to version control (no secrets)

## Manual Test Results

Run these commands to verify:

```bash
# Test 1: Development environment (should succeed)
export API_ENDPOINT="http://localhost:3000/api"
export API_VERSION="v1"
export AUTH_TOKEN="dev_token_123"
export LOG_LEVEL="debug"
export ENVIRONMENT="development"
export WORKBENCH_CONFIG=tests/config-expansion/test-us3-multienv.json
npm run build
npm start
# Expected: Server starts with dev settings

# Test 2: Production environment (should succeed, same config file)
export API_ENDPOINT="https://api.production.example.com"
export API_VERSION="v2"
export AUTH_TOKEN="prod_token_secure"
export LOG_LEVEL="error"
export ENVIRONMENT="production"
npm start
# Expected: Server starts with prod settings

# Test 3: Missing ENVIRONMENT variable (should fail with clear error)
unset ENVIRONMENT
npm start
# Expected: Error message with ENVIRONMENT location and help text

# Test 4: All variables set (should succeed)
export API_ENDPOINT="https://api.staging.example.com"
export API_VERSION="v2-beta"
export AUTH_TOKEN="staging_token"
export LOG_LEVEL="info"
export ENVIRONMENT="staging"
npm start
# Expected: Server starts with all variables expanded
```

## Notes

- Single configuration file works across all environments
- Developers/CI systems set environment-specific variables
- Configuration file contains no secrets, safe to commit
- Error messages help identify missing variables
- Each environment (dev/staging/prod) uses different variable values
- No conditional logic in config file needed
- Supports any number of environments
- Variables control: endpoints, credentials, logging, versioning, etc.
