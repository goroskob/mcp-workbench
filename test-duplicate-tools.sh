#!/bin/bash
# Test script for duplicate tools support feature
# Tests all scenarios from Phase 8 (T044-T053)

set -e

echo "=========================================="
echo "Testing Duplicate Tools Support Feature"
echo "=========================================="
echo ""

# Configuration
export WORKBENCH_CONFIG=./workbench-config-duplicate.json
TEST_LOG="test-results.log"
NODE_BIN="npx"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    echo "[TEST] $1" >> "$TEST_LOG"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "[PASS] $1" >> "$TEST_LOG"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "[FAIL] $1" >> "$TEST_LOG"
}

# Initialize test log
echo "Test Results - $(date)" > "$TEST_LOG"
echo "================================" >> "$TEST_LOG"
echo "" >> "$TEST_LOG"

# Verify build
log_test "T044: Verifying build and configuration..."
if [ ! -f "./dist/index.js" ]; then
    log_fail "Build not found. Run 'npm run build' first."
    exit 1
fi

if [ ! -f "$WORKBENCH_CONFIG" ]; then
    log_fail "Test configuration not found: $WORKBENCH_CONFIG"
    exit 1
fi
log_pass "Build and configuration verified"
echo ""

# T045: Test Scenario 1 - Single toolbox
log_test "T045: Scenario 1 - Open single toolbox"
echo "Expected: Tools should use {toolbox}__{server}_{tool} format"
echo "Expected tool names: dev__memory_create_entities, dev__memory_create_relations, etc."
echo ""
echo "Manual steps required:"
echo "1. Start the workbench server: npm start"
echo "2. Use an MCP client to call: workbench_list_toolboxes"
echo "3. Use an MCP client to call: workbench_open_toolbox with toolbox_name='dev'"
echo "4. Verify tools are registered with format: dev__memory_*"
echo "5. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T045 manual verification required - check test log"
echo ""

# T046: Test Scenario 2 - Two toolboxes with duplicate servers
log_test "T046: Scenario 2 - Open two toolboxes with duplicate servers"
echo "Expected: Both toolboxes should open successfully without conflicts"
echo "Expected tool names from dev: dev__memory_*"
echo "Expected tool names from prod: prod__memory_*"
echo ""
echo "Manual steps required:"
echo "1. Continue from previous test (dev toolbox already open)"
echo "2. Use an MCP client to call: workbench_open_toolbox with toolbox_name='prod'"
echo "3. Verify prod toolbox opens successfully"
echo "4. Verify tools are registered with format: prod__memory_*"
echo "5. Verify no conflicts or errors"
echo "6. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T046 manual verification required - check test log"
echo ""

# T047: Test Scenario 3 - Invoke tools from both toolboxes
log_test "T047: Scenario 3 - Invoke tools from both toolboxes"
echo "Expected: Each tool should route to correct server instance"
echo ""
echo "Manual steps required:"
echo "1. Use MCP client to call: dev__memory_create_entities with test data"
echo "   Example: {\"entities\": [{\"name\": \"dev-user\", \"type\": \"user\"}]}"
echo "2. Use MCP client to call: prod__memory_create_entities with different test data"
echo "   Example: {\"entities\": [{\"name\": \"prod-user\", \"type\": \"user\"}]}"
echo "3. Use MCP client to call: dev__memory_read_graph"
echo "4. Verify only dev-user entity is present in dev's memory"
echo "5. Use MCP client to call: prod__memory_read_graph"
echo "6. Verify only prod-user entity is present in prod's memory"
echo "7. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T047 manual verification required - check test log"
echo ""

# T048: Test Scenario 4 - Close one toolbox
log_test "T048: Scenario 4 - Close one toolbox, verify other remains functional"
echo "Expected: Closing dev should not affect prod"
echo ""
echo "Manual steps required:"
echo "1. Use MCP client to call: workbench_close_toolbox with toolbox_name='dev'"
echo "2. Verify dev toolbox closes successfully"
echo "3. Verify dev__memory_* tools are unregistered"
echo "4. Use MCP client to call: prod__memory_read_graph"
echo "5. Verify prod toolbox still works (prod-user entity still present)"
echo "6. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T048 manual verification required - check test log"
echo ""

# T049: Test Scenario 5 - Re-open closed toolbox
log_test "T049: Scenario 5 - Re-open closed toolbox"
echo "Expected: Dev toolbox should re-open successfully with fresh state"
echo ""
echo "Manual steps required:"
echo "1. Use MCP client to call: workbench_open_toolbox with toolbox_name='dev'"
echo "2. Verify dev__memory_* tools are registered again"
echo "3. Use MCP client to call: dev__memory_read_graph"
echo "4. Verify empty graph (fresh state, dev-user entity should be gone)"
echo "5. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T049 manual verification required - check test log"
echo ""

# T050: Test Scenario 6 - Scale test with 5+ toolboxes
log_test "T050: Scenario 6 - Scale test with 5+ toolboxes"
echo "Expected: All toolboxes should open successfully"
echo "Note: This test requires opening testing toolbox (has 2 servers)"
echo ""
echo "Manual steps required:"
echo "1. Use MCP client to call: workbench_open_toolbox with toolbox_name='testing'"
echo "2. Verify testing__memory_* and testing__memory-secondary_* tools registered"
echo "3. Verify total toolboxes open: dev (re-opened), prod, testing = 3 toolboxes"
echo "4. Verify total servers: 4 (dev:memory, prod:memory, testing:memory, testing:memory-secondary)"
echo "5. Test a tool from each: dev__memory_*, prod__memory_*, testing__memory_*, testing__memory-secondary_*"
echo "6. Record results in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T050 manual verification required - check test log"
echo ""

# T051: Test Scenario 7 - Proxy mode (if enabled)
log_test "T051: Scenario 7 - Proxy mode with duplicate servers"
echo "Note: This test is OPTIONAL if proxy mode is not needed"
echo "To test proxy mode:"
echo "1. Stop the workbench server"
echo "2. Create workbench-config-duplicate-proxy.json with toolMode='proxy'"
echo "3. Start with: WORKBENCH_CONFIG=./workbench-config-duplicate-proxy.json npm start"
echo "4. Use workbench_use_tool instead of calling tools directly"
echo "5. Verify correct routing with proxy mode"
echo ""
read -p "Skip proxy mode test? (y/N): " skip_proxy
if [[ $skip_proxy =~ ^[Yy]$ ]]; then
    log_test "T051 skipped (proxy mode not tested)"
else
    log_test "T051 manual verification required - check test log"
fi
echo ""

# T052: Test Scenario 8 - Error handling
log_test "T052: Scenario 8 - Error handling scenarios"
echo "Expected: Clear error messages for invalid requests"
echo ""
echo "Manual steps required (test each error case):"
echo "1. Call tool with invalid name format: invalid_tool_name"
echo "   Expected error: 'Invalid tool name format'"
echo "2. Call tool with non-existent toolbox: fake__memory_read_graph"
echo "   Expected error: 'Toolbox 'fake' not found'"
echo "3. Call tool with non-existent server: dev__fake_server_tool"
echo "   Expected error: 'Server 'fake_server' not found in toolbox 'dev'"
echo "4. Call workbench_open_toolbox with invalid toolbox name"
echo "   Expected error: 'Toolbox not found in configuration'"
echo "5. Record all error messages in $TEST_LOG"
echo ""
read -p "Press ENTER when test is complete..."
log_test "T052 manual verification required - check test log"
echo ""

# T053: Verify success criteria
log_test "T053: Verify all success criteria from spec.md"
echo ""
echo "Success Criteria Checklist:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[ ] SC-001: Multiple toolboxes with same server can be opened simultaneously"
echo "[ ] SC-002: Tools from different toolboxes have unique names (verified naming pattern)"
echo "[ ] SC-003: Tool invocations route to correct server instance (verified with data test)"
echo "[ ] SC-004: Closing one toolbox doesn't affect others"
echo "[ ] SC-005: Tool naming follows {toolbox}__{server}_{tool} pattern"
echo "[ ] SC-006: System supports 5+ toolboxes with overlapping servers"
echo ""
echo "Manual verification:"
echo "1. Review all test results in $TEST_LOG"
echo "2. Check each success criterion"
echo "3. Document any failures or issues"
echo ""
read -p "Press ENTER when verification is complete..."
log_test "T053 success criteria verification required - check test log"
echo ""

# Summary
echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="
echo ""
echo "Results saved to: $TEST_LOG"
echo ""
echo "Next steps:"
echo "1. Review $TEST_LOG for all test results"
echo "2. Mark completed tests in tasks.md (T044-T053)"
echo "3. Proceed to Phase 9: Polish & Constitution Amendment"
echo ""
