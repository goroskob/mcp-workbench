# Parallel Development Guide: User Stories with Git Worktrees

**Feature**: Environment Variable Expansion in Configuration
**Date**: 2025-10-27
**Status**: Foundation Complete - Ready for Parallel User Story Development

## Overview

Phase 1 (Setup) and Phase 2 (Foundational) are **complete** and committed to the `003-env-var-expansion` branch. The core expansion module (`src/env-expander.ts`) is implemented and integrated with the configuration loader.

All 4 user stories can now be developed **in parallel** using separate git worktrees and Claude Code instances.

---

## Git Worktree Structure

Four worktrees have been created, one for each user story:

| Worktree Directory | Branch | User Story | Priority | Focus |
|-------------------|--------|------------|----------|-------|
| `/Users/gleb/Projects/mcp-workbench` | `003-env-var-expansion` | Main | - | Foundation (complete) |
| `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us1` | `003-env-var-expansion-us1` | US1 | P1 | Secure Credentials |
| `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us2` | `003-env-var-expansion-us2` | US2 | P2 | Cross-Platform Paths |
| `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us3` | `003-env-var-expansion-us3` | US3 | P3 | Multi-Environment |
| `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us4` | `003-env-var-expansion-us4` | US4 | P3 | Default Values |

---

## How to Work in Parallel

### Option 1: Multiple Claude Code Instances (Recommended)

**Setup**:
1. Open 4 separate terminal windows/tabs
2. Launch Claude Code in each worktree directory:

```bash
# Terminal 1 - User Story 1
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us1
code .
# Start Claude Code in this window

# Terminal 2 - User Story 2
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us2
code .
# Start Claude Code in this window

# Terminal 3 - User Story 3
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us3
code .
# Start Claude Code in this window

# Terminal 4 - User Story 4
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us4
code .
# Start Claude Code in this window
```

**Workflow**:
- Each Claude Code instance works independently on its user story
- All instances start from the same foundation (Phase 1-2 complete)
- No merge conflicts since each story modifies different test files
- Progress tracked independently in each worktree's `tasks.md`

### Option 2: Sequential Development (Single Instance)

If you prefer to work on one story at a time:

```bash
# Work on US1
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us1
# Complete US1 tasks, commit

# Switch to US2
cd ../003-env-var-expansion-us2
# Complete US2 tasks, commit

# ... and so on
```

---

## User Story Tasks

### User Story 1 - Secure Credential Management (Priority: P1)

**Branch**: `003-env-var-expansion-us1`
**Worktree**: `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us1`

**Tasks** (from tasks.md):
- [ ] T011 [US1] Create tests/config-expansion/test-us1-credentials.json
- [ ] T012 [US1] Document test procedure in test-us1-credentials.md
- [ ] T013 [US1] Test expansion in `env` object values
- [ ] T014 [US1] Test expansion in `command` field
- [ ] T015 [US1] Test expansion in `args` array
- [ ] T016 [US1] Test error message when required variable missing
- [ ] T017 [US1] Test multiple variables in single config

**Focus**: `${API_KEY}` syntax for credentials in env, command, args fields

**Test Config Example**:
```json
{
  "toolboxes": {
    "test": {
      "description": "Test credential expansion",
      "mcpServers": {
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"],
          "env": {
            "API_KEY": "${API_KEY}",
            "DATABASE_PASSWORD": "${DATABASE_PASSWORD}"
          }
        }
      }
    }
  }
}
```

---

### User Story 2 - Cross-Platform Path Handling (Priority: P2)

**Branch**: `003-env-var-expansion-us2`
**Worktree**: `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us2`

**Tasks** (from tasks.md):
- [ ] T018 [US2] Create tests/config-expansion/test-us2-paths.json
- [ ] T019 [US2] Document cross-platform test procedure
- [ ] T020 [US2] Test path expansion in command field
- [ ] T021 [US2] Test path expansion in args array
- [ ] T022 [US2] Test special characters in path values
- [ ] T023 [US2] Test empty string vs unset variables

**Focus**: `${HOME}`, `${PROJECT_ROOT}` for machine-specific paths

**Test Config Example**:
```json
{
  "toolboxes": {
    "test": {
      "description": "Test path expansion",
      "mcpServers": {
        "server": {
          "command": "${HOME}/tools/server.js",
          "args": ["${PROJECT_ROOT}/config.json"]
        }
      }
    }
  }
}
```

---

### User Story 3 - Environment-Specific Configuration (Priority: P3)

**Branch**: `003-env-var-expansion-us3`
**Worktree**: `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us3`

**Tasks** (from tasks.md):
- [ ] T024 [US3] Create tests/config-expansion/test-us3-multienv.json
- [ ] T025 [US3] Document multi-environment test procedure
- [ ] T026 [US3] Test expansion in `url` field for HTTP servers
- [ ] T027 [US3] Test expansion in `headers` object
- [ ] T028 [US3] Test multiple variables controlling different aspects
- [ ] T029 [US3] Test environment switching without config changes

**Focus**: `${API_ENDPOINT}` for multi-environment (dev/staging/prod)

**Test Config Example**:
```json
{
  "toolboxes": {
    "test": {
      "description": "Test multi-environment",
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["api-server.js"],
          "url": "${API_ENDPOINT}",
          "env": {
            "AUTH_TOKEN": "${AUTH_TOKEN}"
          }
        }
      }
    }
  }
}
```

---

### User Story 4 - Default Values for Optional Settings (Priority: P3)

**Branch**: `003-env-var-expansion-us4`
**Worktree**: `/Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us4`

**Tasks** (from tasks.md):
- [ ] T030 [US4] Create tests/config-expansion/test-us4-defaults.json
- [ ] T031 [US4] Document default values test procedure
- [ ] T032 [US4] Test default value syntax
- [ ] T033 [US4] Test environment variable override
- [ ] T034 [US4] Test multiple variables with mixed defaults
- [ ] T035 [US4] Test default value validation
- [ ] T036 [US4] Verify empty string vs default behavior

**Focus**: `${VAR:-default}` syntax for optional settings

**Test Config Example**:
```json
{
  "toolboxes": {
    "test": {
      "description": "Test default values",
      "mcpServers": {
        "server": {
          "command": "node",
          "args": ["server.js"],
          "env": {
            "LOG_LEVEL": "${LOG_LEVEL:-info}",
            "PORT": "${PORT:-3000}",
            "DEBUG": "${DEBUG:-false}"
          }
        }
      }
    }
  }
}
```

---

## Development Workflow

### For Each User Story

1. **Navigate to worktree**:
   ```bash
   cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us{1|2|3|4}
   ```

2. **Verify foundation is present**:
   ```bash
   ls src/env-expander.ts  # Should exist
   git log --oneline -1     # Should show foundational commit
   ```

3. **Create test configuration**:
   - Create `tests/config-expansion/test-us{X}-{name}.json`
   - Create `tests/config-expansion/test-us{X}-{name}.md` (test procedure)

4. **Run manual tests**:
   ```bash
   # Set environment variables for testing
   export API_KEY="test_key"
   export HOME="/Users/testuser"
   # ... etc

   # Set config path
   export WORKBENCH_CONFIG=tests/config-expansion/test-us1-credentials.json

   # Build and run
   npm run build
   npm start
   ```

5. **Verify expansion works**:
   - Check that variables are expanded correctly
   - Test error cases (missing variables)
   - Verify error messages are clear

6. **Update tasks.md**:
   - Mark completed tasks with `[X]`
   - Commit progress regularly

7. **Commit when story complete**:
   ```bash
   git add tests/config-expansion/test-us{X}-*
   git add specs/003-env-var-expansion/tasks.md
   git commit -m "feat(us{X}): complete User Story {X} - {title}

   - Create test configuration for {focus}
   - Document test procedure
   - Verify {specific functionality}
   - All acceptance scenarios pass

   Closes User Story {X} (Priority: P{X})

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

---

## Merging User Stories Back

### After Each User Story Completes

1. **Push branch to remote**:
   ```bash
   git push origin 003-env-var-expansion-us{X}
   ```

2. **Create Pull Request** (optional, for code review):
   - Base: `003-env-var-expansion`
   - Compare: `003-env-var-expansion-us{X}`
   - Review changes, ensure only test files modified

3. **Merge into foundation branch**:
   ```bash
   # From main worktree
   cd /Users/gleb/Projects/mcp-workbench
   git checkout 003-env-var-expansion
   git merge 003-env-var-expansion-us1 --no-ff
   git merge 003-env-var-expansion-us2 --no-ff
   git merge 003-env-var-expansion-us3 --no-ff
   git merge 003-env-var-expansion-us4 --no-ff
   ```

4. **Resolve conflicts** (if any):
   - Only `tasks.md` should have conflicts (task completion markers)
   - Keep all `[X]` completed markers from all branches
   - Test configs are independent (no conflicts expected)

---

## Cleanup After Feature Complete

Once all user stories are merged and feature is complete:

```bash
# Remove worktrees
git worktree remove 003-env-var-expansion-us1
git worktree remove 003-env-var-expansion-us2
git worktree remove 003-env-var-expansion-us3
git worktree remove 003-env-var-expansion-us4

# Delete branches (optional, if merged)
git branch -d 003-env-var-expansion-us1
git branch -d 003-env-var-expansion-us2
git branch -d 003-env-var-expansion-us3
git branch -d 003-env-var-expansion-us4

# Continue with Phase 7 (Edge Cases) and Phase 8 (Documentation)
# in main 003-env-var-expansion branch
```

---

## Status Tracking

### Foundation (Complete ✅)

- [X] Phase 1: Setup (T001-T002)
- [X] Phase 2: Foundational (T003-T010)
- **Commit**: `656d580` - "feat: add environment variable expansion module (Phase 1-2)"

### User Stories (In Progress)

| Story | Status | Branch | Worktree |
|-------|--------|--------|----------|
| US1 (P1) | ⏳ Ready | `003-env-var-expansion-us1` | `/mcp-workbench/003-env-var-expansion-us1` |
| US2 (P2) | ⏳ Ready | `003-env-var-expansion-us2` | `/mcp-workbench/003-env-var-expansion-us2` |
| US3 (P3) | ⏳ Ready | `003-env-var-expansion-us3` | `/mcp-workbench/003-env-var-expansion-us3` |
| US4 (P3) | ⏳ Ready | `003-env-var-expansion-us4` | `/mcp-workbench/003-env-var-expansion-us4` |

### Remaining Phases

- [ ] Phase 7: Edge Cases & Error Handling (T037-T043)
- [ ] Phase 8: Documentation & Polish (T044-T053)

---

## Tips for Parallel Development

1. **Independent Test Files**: Each user story creates different test config files, so no conflicts expected
2. **Shared Foundation**: All worktrees share the same `src/env-expander.ts` and `src/config-loader.ts` from Phase 2
3. **Task Tracking**: Update `tasks.md` in each worktree independently, merge carefully later
4. **Regular Commits**: Commit after each completed task to avoid losing work
5. **Test Early**: Run `npm run build` frequently to catch TypeScript errors
6. **Environment Variables**: Use different terminal sessions with different env vars for testing different scenarios

---

## Quick Reference

**Main Repository**:
```bash
cd /Users/gleb/Projects/mcp-workbench
```

**User Story Worktrees**:
```bash
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us1  # US1
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us2  # US2
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us3  # US3
cd /Users/gleb/Projects/mcp-workbench/003-env-var-expansion-us4  # US4
```

**List All Worktrees**:
```bash
git worktree list
```

**Build and Test**:
```bash
npm run build
export WORKBENCH_CONFIG=tests/config-expansion/test-us1-credentials.json
npm start
```

---

## Next Steps

1. **Choose Development Approach**:
   - **Parallel**: Open 4 Claude Code instances, work on all stories simultaneously (fastest)
   - **Sequential**: Work on US1 → US2 → US3 → US4 in priority order (safer)

2. **Start Implementation**:
   - Navigate to first worktree
   - Create test configurations
   - Verify expansion works
   - Document test procedures
   - Mark tasks complete

3. **Merge and Continue**:
   - After all user stories complete, merge back to foundation branch
   - Continue with Phase 7 (Edge Cases) and Phase 8 (Documentation)

---

**Ready for Parallel Development!** 🚀

The foundation is solid, all user stories are independent, and worktrees are set up. You can now develop all 4 user stories in parallel using separate Claude Code instances.
