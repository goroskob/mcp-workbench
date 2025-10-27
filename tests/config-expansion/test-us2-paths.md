# Test Procedure: US2 - Cross-Platform Path Handling

**Test Configuration**: `test-us2-paths.json`
**User Story**: US2 - Cross-Platform Paths (Priority P2)
**Tasks**: T018-T023

## Purpose

Verify that environment variable expansion works for cross-platform paths using `${VAR}` syntax in:
- `command` field (T020)
- `args` array (T021)
- `env` object for path values (T020)
- Special characters in paths (T022)
- Empty string vs unset variables (T023)

## Test Scenarios

### Scenario 1: Path Expansion in Command Field (T020)

**Given**: Configuration has `${HOME}/tools/npx` in command field
**When**: HOME environment variable is set to actual user home directory
**Then**: Server command uses expanded absolute path

**Test Steps**:
```bash
export HOME="$HOME"  # Use actual home directory
export PROJECT_ROOT="$(pwd)"
export WORKBENCH_CONFIG=tests/config-expansion/test-us2-paths.json
npm run build
npm start
```

**Expected**: Server starts successfully, command path resolved correctly

### Scenario 2: Path Expansion in Args Array (T021)

**Given**: Configuration has `${PROJECT_ROOT}/data` in args field
**When**: PROJECT_ROOT is set to current directory
**Then**: Server receives expanded project-relative path

**Verification**: Check that args array contains full path, not literal string

### Scenario 3: Multiple Path Variables (Acceptance Scenario)

**Given**: Multiple path variables used (HOME, PROJECT_ROOT)
**When**: All variables are set to appropriate paths
**Then**: All paths are substituted correctly throughout the configuration

**Verification**: Both HOME and PROJECT_ROOT expand successfully in different fields

### Scenario 4: Cross-Platform Compatibility

**Given**: Same configuration used on different operating systems
**When**: HOME and PROJECT_ROOT set to OS-specific paths
**Then**: Configuration works without modification

**Test on macOS/Linux**:
```bash
export HOME="/Users/username"  # macOS
# or
export HOME="/home/username"   # Linux

export PROJECT_ROOT="$(pwd)"
export WORKBENCH_CONFIG=tests/config-expansion/test-us2-paths.json
npm start
```

**Expected**: Works on both macOS and Linux with appropriate path separators

### Scenario 5: Special Characters in Path Values (T022)

**Given**: Path contains spaces or special characters
**When**: Environment variable contains path like `/path/with spaces/dir`
**Then**: Path is expanded correctly with spaces preserved

**Test Steps**:
```bash
export HOME="/Users/test user"
export PROJECT_ROOT="$(pwd)"
export WORKBENCH_CONFIG=tests/config-expansion/test-us2-paths.json
npm start
```

**Expected**: Spaces in path don't break expansion

### Scenario 6: Empty String vs Unset Variables (T023)

**Given**: Configuration references ${PROJECT_ROOT}
**When**: Variable is explicitly set to empty string
**Then**: Empty string is used (not treated as unset)

**Test Steps**:
```bash
# Test 1: Variable set to empty string (should use empty string)
export PROJECT_ROOT=""
export HOME="$HOME"
export WORKBENCH_CONFIG=tests/config-expansion/test-us2-paths.json
npm start
# Expected: args contains empty string for PROJECT_ROOT

# Test 2: Variable unset (should fail since no default)
unset PROJECT_ROOT
npm start
# Expected: Error message about missing PROJECT_ROOT variable
```

**Expected Behavior**:
- Empty string (`export VAR=""`) → Uses empty string as value
- Unset variable (`unset VAR`) → Error (missing required variable)

## Acceptance Criteria

- ✅ `${HOME}` expands correctly in command field (T020)
- ✅ `${PROJECT_ROOT}` expands correctly in args array (T021)
- ✅ Path variables work in env object (T020)
- ✅ Multiple path variables in single config all expand (T021)
- ✅ Works on different operating systems without config changes
- ✅ Paths with special characters (spaces, colons) work correctly (T022)
- ✅ Empty string values distinct from unset variables (T023)
- ✅ Missing required path variable produces clear error with location

## Manual Test Results

Run these commands to verify:

```bash
# Test 1: All path variables set (should succeed)
export HOME="$HOME"
export PROJECT_ROOT="$(pwd)"
export WORKBENCH_CONFIG=tests/config-expansion/test-us2-paths.json
npm run build
npm start
# Expected: Server starts, paths expanded

# Test 2: Missing PROJECT_ROOT (should fail with clear error)
unset PROJECT_ROOT
npm start
# Expected: Error message with PROJECT_ROOT location and help text

# Test 3: Empty string path (should succeed with empty string)
export PROJECT_ROOT=""
export HOME="$HOME"
npm start
# Expected: Uses empty string for PROJECT_ROOT in args

# Test 4: Path with spaces (should succeed)
export HOME="/Users/test user"
export PROJECT_ROOT="$(pwd)"
npm start
# Expected: Spaces preserved in expanded paths
```

## Notes

- Path separators (/ vs \) handled by Node.js automatically
- Configuration is portable across macOS, Linux, Windows
- Each developer sets their own HOME and PROJECT_ROOT
- Relative paths can be made absolute using env vars
- Error messages provide exact location and resolution steps
- Supports absolute and relative paths via variables
