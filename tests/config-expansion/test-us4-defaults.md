# Test Procedure: US4 - Default Values for Optional Settings

**Test Configuration**: `test-us4-defaults.json`
**User Story**: US4 - Default Values (Priority P3)
**Tasks**: T030-T036

## Purpose

Verify that environment variable expansion with default values using `${VAR:-default}` syntax works for:
- Optional configuration parameters (T032)
- Environment variable override of defaults (T033)
- Mixed required and optional variables (T034)
- Default value validation (T035)
- Empty string vs default value behavior (T036)

## Test Scenarios

### Scenario 1: Default Values Used When Variables Unset (T032)

**Given**: Configuration has `${LOG_LEVEL:-info}` and other variables with defaults
**When**: Environment variables are not set
**Then**: Default values are used

**Test Steps**:
```bash
# Ensure optional variables are unset
unset LOG_LEVEL
unset DEBUG_MODE
unset MAX_CONNECTIONS
unset TIMEOUT
unset PORT
unset HOST

# Set only required variable (no default)
export API_KEY="required_key_123"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm run build
npm start
```

**Expected Results**:
- `LOG_LEVEL` = "info" (default)
- `DEBUG_MODE` = "false" (default)
- `MAX_CONNECTIONS` = "100" (default)
- `TIMEOUT` = "30000" (default)
- `PORT` = "3000" (default)
- `HOST` = "localhost" (default)
- `API_KEY` = "required_key_123" (from environment)

### Scenario 2: Environment Variables Override Defaults (T033)

**Given**: Configuration has variables with defaults
**When**: Environment variables are explicitly set
**Then**: Environment values take precedence over defaults

**Test Steps**:
```bash
export LOG_LEVEL="debug"
export DEBUG_MODE="true"
export MAX_CONNECTIONS="500"
export TIMEOUT="60000"
export PORT="8080"
export HOST="0.0.0.0"
export API_KEY="required_key_123"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected Results**:
- `LOG_LEVEL` = "debug" (overridden)
- `DEBUG_MODE` = "true" (overridden)
- `MAX_CONNECTIONS` = "500" (overridden)
- `TIMEOUT` = "60000" (overridden)
- `PORT` = "8080" (overridden)
- `HOST` = "0.0.0.0" (overridden)
- `API_KEY` = "required_key_123" (from environment, no default)

### Scenario 3: Mixed Required and Optional Variables (T034)

**Given**: Configuration has both required (`${API_KEY}`) and optional (`${LOG_LEVEL:-info}`) variables
**When**: Only required variables are set
**Then**: Required variables must be provided, optional use defaults

**Test Steps**:
```bash
# Set only required variable
export API_KEY="required_key_123"
unset LOG_LEVEL
unset DEBUG_MODE
unset PORT
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected**: Server starts with defaults for optional vars, required var from environment

### Scenario 4: Missing Required Variable with Defaults Present (Error)

**Given**: Configuration has both required and optional variables
**When**: Required variable (no default) is missing
**Then**: Clear error even though other variables have defaults

**Test Steps**:
```bash
unset API_KEY
export LOG_LEVEL="info"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected Error Message**:
```
Failed to load configuration from tests/config-expansion/test-us4-defaults.json:
Environment variable expansion failed
  Variable: API_KEY
  Location: config.toolboxes.test-defaults.mcpServers.configurable-server.env.REQUIRED_API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

### Scenario 5: Empty String vs Default Value (T036)

**Given**: Configuration has `${LOG_LEVEL:-info}` with default
**When**: LOG_LEVEL is explicitly set to empty string
**Then**: Empty string is used (default is NOT used)

**Test Steps**:
```bash
# Test 1: Empty string explicitly set (should use empty string, not default)
export LOG_LEVEL=""
export API_KEY="required_key_123"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
# Expected: LOG_LEVEL = "" (empty string, not "info")

# Test 2: Variable unset (should use default)
unset LOG_LEVEL
npm start
# Expected: LOG_LEVEL = "info" (default)
```

**Expected Behavior**:
- Empty string (`export VAR=""`) → Uses empty string as value (default ignored)
- Unset variable (`unset VAR`) → Uses default value

### Scenario 6: Default Value Validation (T035)

**Given**: Configuration has valid default value syntax
**When**: Configuration is loaded
**Then**: Defaults are parsed correctly

**Valid Syntax Examples**:
- `${LOG_LEVEL:-info}` → default is "info"
- `${PORT:-3000}` → default is "3000"
- `${DEBUG:-false}` → default is "false"
- `${HOST:-localhost}` → default is "localhost"
- `${MAX:-100}` → default is "100"

**Test Steps**:
```bash
export API_KEY="key"
unset LOG_LEVEL
unset PORT
unset DEBUG_MODE
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected**: All defaults parsed and applied correctly

### Scenario 7: Partial Override of Defaults (T033, T034)

**Given**: Multiple variables with defaults
**When**: Some variables set, others unset
**Then**: Set variables override, unset use defaults

**Test Steps**:
```bash
export LOG_LEVEL="error"  # Override default
unset DEBUG_MODE           # Use default (false)
export PORT="9000"         # Override default
unset HOST                 # Use default (localhost)
export API_KEY="key"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected Results**:
- `LOG_LEVEL` = "error" (overridden)
- `DEBUG_MODE` = "false" (default)
- `PORT` = "9000" (overridden)
- `HOST` = "localhost" (default)

### Scenario 8: All Optional Variables With Defaults

**Given**: Configuration has only optional variables (all with defaults)
**When**: No environment variables are set
**Then**: Server starts successfully with all defaults

**Test Steps**:
```bash
# Unset all optional variables
unset LOG_LEVEL
unset DEBUG_MODE
unset MAX_CONNECTIONS
unset TIMEOUT
unset PORT
unset HOST

# Set required variable
export API_KEY="key"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm start
```

**Expected**: Server starts with all default values applied

## Acceptance Criteria

- ✅ `${LOG_LEVEL:-info}` uses "info" when LOG_LEVEL unset (T032)
- ✅ `${PORT:-3000}` uses "3000" when PORT unset (T032)
- ✅ `${DEBUG_MODE:-false}` uses "false" when DEBUG_MODE unset (T032)
- ✅ Environment variable overrides default (T033)
- ✅ Multiple variables with mixed defaults and overrides work (T034)
- ✅ Required variable without default produces error when missing (T034)
- ✅ Empty string (`export VAR=""`) does NOT use default (T036)
- ✅ Unset variable uses default value (T036)
- ✅ Defaults are validated and parsed correctly (T035)
- ✅ Configuration starts successfully with all defaults
- ✅ Configuration works with partial overrides of defaults

## Manual Test Results

Run these commands to verify:

```bash
# Test 1: All defaults used (should succeed)
unset LOG_LEVEL
unset DEBUG_MODE
unset PORT
unset HOST
unset MAX_CONNECTIONS
unset TIMEOUT
export API_KEY="test_key_123"
export WORKBENCH_CONFIG=tests/config-expansion/test-us4-defaults.json
npm run build
npm start
# Expected: Server starts with defaults (info, false, 3000, localhost, 100, 30000)

# Test 2: Override defaults (should succeed)
export LOG_LEVEL="debug"
export DEBUG_MODE="true"
export PORT="8080"
export HOST="0.0.0.0"
export MAX_CONNECTIONS="500"
export TIMEOUT="60000"
export API_KEY="test_key_123"
npm start
# Expected: Server starts with overridden values

# Test 3: Empty string vs unset (should use empty string)
export LOG_LEVEL=""
export API_KEY="test_key_123"
unset DEBUG_MODE
npm start
# Expected: LOG_LEVEL is empty string, DEBUG_MODE is "false" (default)

# Test 4: Missing required variable (should fail)
unset API_KEY
export LOG_LEVEL="info"
npm start
# Expected: Error message with API_KEY location and help text

# Test 5: Partial override (should succeed)
export LOG_LEVEL="warn"
unset PORT
unset HOST
export API_KEY="test_key_123"
npm start
# Expected: LOG_LEVEL="warn", PORT="3000" (default), HOST="localhost" (default)
```

## Notes

- Default value syntax: `${VAR:-default}` (colon-dash separates variable from default)
- Empty string is a valid value and DIFFERENT from unset variable
- Required variables: `${VAR}` (no default, must be set)
- Optional variables: `${VAR:-default}` (default used if unset)
- Defaults improve out-of-box experience (sensible defaults, override when needed)
- Configuration can mix required and optional variables
- Error messages only appear for required variables (no defaults)
- Defaults are literal strings (no nested expansion in default values)
