# Constitution Amendment 1.1.0

## Amendment Summary

**Version**: 1.0.0 → 1.1.0
**Date**: 2025-10-27
**Type**: MINOR (new capability, backward-incompatible but extends principle)
**Trigger**: Feature implementation for duplicate tools support (Spec 001)

## Changes

### Modified Principles

#### Principle II: Tool Naming and Conflict Resolution

**Previous (v1.0.0)**:
> All downstream tools MUST be prefixed with their source server name using the pattern `{server}_{tool}` to prevent naming conflicts

**Updated (v1.1.0)**:
> All downstream tools MUST be prefixed with both their toolbox and source server name using the pattern `{toolbox}__{server}_{tool}` to prevent naming conflicts

**Key Changes**:
- Added toolbox-level prefix to tool naming
- Changed from 2-level naming (`{server}_{tool}`) to 3-level naming (`{toolbox}__{server}_{tool}`)
- Introduced double underscore `__` as delimiter between toolbox and server+tool
- Updated tool description prefix from `[server]` to `[toolbox/server]`
- Added concrete examples to principle documentation

#### Principle III: Mode-Agnostic Tool Invocation

**Previous (v1.0.0)**:
> Use identical `{server}_{tool}` naming convention

**Updated (v1.1.0)**:
> Use identical `{toolbox}__{server}_{tool}` naming convention

**Key Changes**:
- Updated naming convention reference to match Principle II

## Rationale

### Problem Statement
The previous 2-level naming pattern (`{server}_{tool}`) prevented multiple toolboxes from using the same MCP server because tool names would conflict globally across the workbench. This limitation blocked important use cases:

- Development vs Production environments using the same servers
- Multi-tenant scenarios with isolated server instances
- Testing toolboxes with duplicate server configurations

### Solution
The 3-level naming pattern (`{toolbox}__{server}_{tool}`) adds toolbox context to tool names, enabling:

1. **Toolbox isolation**: Each toolbox can have its own instance of the same server
2. **Unique addressability**: Tools are uniquely identifiable: `dev__filesystem_read_file` vs `prod__filesystem_read_file`
3. **Correct routing**: Tool handler can dynamically look up the correct toolbox→server→tool path
4. **Clear provenance**: Tool names explicitly show which toolbox and server they belong to

### Breaking Change Impact
This is a **breaking change** for existing users:

- All tool names change format
- MCP clients must update tool invocation names
- Configuration files remain unchanged (no user action required)
- Comprehensive migration guide provided in CHANGELOG.md and README.md

## Implementation

### Core Changes
1. **src/types.ts**: Added `toolbox_name` field to `RegisteredToolInfo` interface
2. **src/client-manager.ts**:
   - Added `generateToolName(toolbox, server, tool)` utility
   - Added `parseToolName(registeredName)` utility for extracting components
   - Updated tool registration to use 3-level naming
   - Updated tool handler to perform dynamic toolbox/server lookup
3. **Error handling**: Added validation for missing toolbox and missing server

### Documentation Updates
Following constitution's mandatory documentation update requirements:

- ✅ **README.md**: Updated tool naming section, added migration guide, updated all examples
- ✅ **CLAUDE.md**: Updated architecture overview, tool naming convention, implementation details
- ✅ **CHANGELOG.md**: Created with comprehensive breaking change documentation
- ✅ **TESTING.md**: Created comprehensive testing guide for duplicate tools scenarios

### Testing Approach
- Created test configuration: `workbench-config-duplicate.json`
- Created test script: `test-duplicate-tools.sh`
- Documented 8 manual test scenarios covering all success criteria
- All tests use real MCP servers per constitution's testing philosophy

## Version Classification

Per constitution's amendment versioning rules:

- **MAJOR** (backward incompatible principle removals/redefinitions): ❌ Not applicable
- **MINOR** (new principles or materially expanded guidance): ✅ **Selected** - Principle II materially expanded with new capability
- **PATCH** (clarifications, wording improvements): ❌ Not applicable

**Justification**: While the naming change is breaking for end users (requires v0.4.0 release), the constitutional change is MINOR because:
- Principle II's core purpose (conflict resolution) remains the same
- The principle is expanded, not redefined
- New capability (duplicate servers) aligns with existing principle intent
- Previous implementation was a subset of the new capability

## Compliance Verification

### Core Principles
- ✅ **Principle I (Meta-Server Orchestration)**: Unchanged, still applies
- ✅ **Principle II (Tool Naming)**: Updated as documented above
- ✅ **Principle III (Mode-Agnostic Invocation)**: Updated reference to match Principle II
- ✅ **Principle IV (Configuration as Contract)**: Unchanged, configuration format compatible
- ✅ **Principle V (Fail-Safe Error Handling)**: Enhanced with toolbox context in errors

### Documentation Standards
- ✅ README.md updated (user-facing changes)
- ✅ CLAUDE.md updated (architecture changes)
- ✅ Both documents synchronized

### Template Synchronization
- ✅ plan-template.md - No changes needed (principle-agnostic)
- ✅ spec-template.md - No changes needed (principle-agnostic)
- ✅ tasks-template.md - No changes needed (principle-agnostic)

### Implementation Requirements
- ✅ TypeScript strict mode maintained
- ✅ All types explicitly defined
- ✅ Error messages include toolbox context
- ✅ Testing with real MCP servers documented

## Governance Process

1. ✅ **Issue Documentation**: Tracked in specs/001-duplicate-tools-support/
2. ✅ **Discussion**: Documented in spec.md and plan.md
3. ✅ **Version Update**: Constitution updated to v1.1.0
4. ✅ **Sync Impact Report**: Updated with all changes
5. ✅ **Template Review**: All templates verified for consistency

## Release Coordination

This constitution amendment corresponds to:

- **Application Version**: v0.4.0 (MAJOR bump due to breaking change in tool naming)
- **Constitution Version**: v1.1.0 (MINOR bump due to principle expansion)

The different version bump semantics reflect:
- Constitution tracks principle evolution (MINOR = new capability)
- Application tracks user impact (MAJOR = breaking change)

## Approval

**Amendment Type**: MINOR
**Approved By**: Implementation following spec-driven development process
**Date**: 2025-10-27
**Effective**: Immediately upon merge

## References

- Feature Specification: [specs/001-duplicate-tools-support/spec.md](../../specs/001-duplicate-tools-support/spec.md)
- Implementation Plan: [specs/001-duplicate-tools-support/plan.md](../../specs/001-duplicate-tools-support/plan.md)
- Task Breakdown: [specs/001-duplicate-tools-support/tasks.md](../../specs/001-duplicate-tools-support/tasks.md)
- CHANGELOG: [CHANGELOG.md](../../../CHANGELOG.md)
- Testing Guide: [TESTING.md](../../../TESTING.md)
