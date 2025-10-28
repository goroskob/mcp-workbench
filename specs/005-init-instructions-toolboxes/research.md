# Research: Initialization Instructions for Toolboxes

**Feature**: 005-init-instructions-toolboxes
**Date**: 2025-10-28
**Purpose**: Resolve technical unknowns before design phase

## Research Questions

### 1. MCP Initialization Protocol - Instructions Field

**Question**: What is the exact format and constraints for the `instructions` field in MCP initialization responses?

**Decision**: The `instructions` field is a **string** field in the `InitializeResult` returned by MCP servers during the initialization handshake.

**Rationale**: Based on the MCP SDK TypeScript types from `@modelcontextprotocol/sdk`, the `InitializeResult` interface includes:
```typescript
interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;  // Optional string field
}
```

The field is:
- **Optional** - servers can omit it
- **String type** - supports any text content
- **No specified length limit** in the protocol specification
- **Human-readable** - intended for display to users/agents

**Alternatives Considered**:
- Structured JSON in instructions field → Rejected: MCP spec defines it as string, not JSON object
- Separate discovery endpoint → Rejected: Defeats the purpose of using initialization

**Implementation Guidance**: We can safely add a plain text formatted string to the initialization response's `instructions` field without protocol violations.

---

### 2. Plain Text Formatting Best Practices

**Question**: What's the best plain text format for listing toolboxes with names, descriptions, and tool counts?

**Decision**: Use a structured plain text format with clear sections and consistent indentation:

```
Available Toolboxes:

[toolbox-name] (N tools)
  Description: [description text]

[toolbox-name-2] (M tools)
  Description: [description text]
```

**Rationale**:
- Clear visual hierarchy through blank lines and indentation
- Parseable pattern if clients want to extract data programmatically
- Human-readable for direct display
- Compact enough to avoid message size concerns
- Tool counts prominently displayed for quick assessment

**Alternatives Considered**:
- Markdown format → Rejected: User specified plain text in FR-007
- JSON-like structure → Rejected: Would be harder to read as plain text
- Table format with ASCII borders → Rejected: Unnecessarily complex for simple listing
- Single line per toolbox → Rejected: Harder to read descriptions

**Implementation Guidance**: Generate instructions string using template literals with consistent spacing and newlines.

---

### 3. Initialization Response Examples from MCP Ecosystem

**Question**: How do other MCP servers use the `instructions` field?

**Research Findings**:

From examining the MCP SDK documentation and examples:

1. **@modelcontextprotocol/server-filesystem**: Does not use instructions field
2. **@modelcontextprotocol/server-memory**: Does not use instructions field
3. **Custom MCP servers**: Instructions field usage is relatively rare, primarily used for:
   - Authentication guidance
   - Usage prerequisites or setup steps
   - Special capabilities or limitations
   - Connection-specific information

**Decision**: Use instructions field for **discovery and usage guidance** - list available toolboxes and explain how to open them.

**Rationale**:
- Our use case (toolbox listing) is a perfect fit for initialization instructions
- Instructions help clients understand what's available before making any tool calls
- This is more discoverable than requiring documentation lookup
- Aligns with the intent of the instructions field (guiding users/agents)

**Implementation Guidance**: Include both the toolbox listing and a brief usage hint:
```
Available Toolboxes:
[listings]

To access tools from a toolbox, use workbench_open_toolbox with the toolbox name.
```

---

### 4. Empty Toolbox Handling

**Question**: What should instructions contain when no toolboxes are configured?

**Decision**: Provide clear message indicating no toolboxes are available and guidance on configuration.

```
No toolboxes configured.

To configure toolboxes, add them to your workbench-config.json file.
See documentation for configuration format.
```

**Rationale**:
- Empty response would be confusing
- Helpful error message guides users to resolution
- Maintains consistent instructions field usage
- Avoids null/undefined field value

**Alternatives Considered**:
- Omit instructions field entirely → Rejected: Less helpful, breaks consistency
- Error during initialization → Rejected: Not an error condition, valid configuration state
- Just "No toolboxes configured" → Rejected: Less helpful without guidance

---

### 5. Performance Impact Assessment

**Question**: What's the performance impact of generating instructions on every initialization?

**Analysis**:
- Configuration is already loaded and validated at server startup
- Toolbox metadata is in memory (names, descriptions from config)
- Tool counts require querying opened toolboxes OR reading from cached connection data
- String concatenation/template literal performance is negligible for <100 toolboxes

**Decision**: Generate instructions string lazily during initialization handler, using cached configuration data.

**Rationale**:
- Config data already in memory (no I/O)
- String building for ~10-20 toolboxes is <1ms
- No database queries or network calls needed
- Well within the <100ms constraint from success criteria

**Implementation Guidance**:
- Read toolbox names and descriptions from `this.config.toolboxes`
- Tool counts can be computed from `toolFilters` arrays in config (count of tools, or "*" = all tools indicator)
- Use Array.map() + join() for efficient string building

---

### 6. Tool Count Accuracy at Initialization Time

**Question**: Can we accurately report tool counts before opening any toolboxes?

**Analysis**: At initialization time, **we have not connected to any downstream servers yet** (lazy connection management principle). We have two options:

1. **Report configured tool filter count** - indicates how many tools are allowed/filtered
2. **Report "N servers"** instead of tool count - more accurate since we haven't connected
3. **Connect during initialization** - violates lazy connection principle

**Decision**: Report **server count** instead of tool count in initialization instructions, since tool counts are only known after opening toolboxes.

```
[toolbox-name] (N servers)
  Description: [description text]
```

**Rationale**:
- More accurate - we know server count from configuration
- Doesn't violate lazy connection management
- Still provides useful information (scale indicator)
- Avoids misleading tool counts that might be incorrect
- Maintains <100ms initialization constraint

**Alternatives Considered**:
- Report tool filter count → Rejected: Misleading ("*" means all tools, count unknown)
- Connect all servers during init → Rejected: Violates core principle, impacts performance
- Omit counts entirely → Rejected: Less informative
- Report "tools available after opening" → Rejected: Wordy and awkward

**Impact on Spec**: Update spec.md to reflect that initialization instructions show server counts, not tool counts. Tool counts are available after calling `workbench_open_toolbox`.

---

## Summary of Technical Decisions

| Decision Area | Choice | Key Rationale |
|--------------|--------|---------------|
| Instructions field format | Plain text string | MCP SDK defines it as optional string field |
| Text layout | Structured with sections and indentation | Balance readability and parseability |
| Empty state handling | Helpful message with config guidance | Better UX than omitting field |
| Performance approach | Lazy generation from cached config | No I/O needed, <1ms overhead |
| Count metric | Server count (not tool count) | Accurate without violating lazy connection |
| Usage guidance | Include brief hint about open_toolbox | Help users understand next steps |

## Implementation Readiness

✅ All research questions resolved
✅ No blocking technical unknowns
✅ Design decisions documented
✅ Ready for Phase 1 (Data Model & Contracts)

## Clarifications Added (2025-10-28)

After initial research, the following clarifications were made during `/speckit.clarify` session:

1. **Version Strategy**: MINOR bump (0.8.0 → 0.9.0) instead of MAJOR - user chose pragmatic simplicity over strict semver
2. **Migration Communication**: Silent removal approach - no deprecation warnings or migration guide needed
3. **Edge Case - Invalid Config**: Confirmed fail-fast at startup (already existing behavior, no changes needed)
4. **Edge Case - Long Descriptions**: No truncation - assume reasonable description lengths in configuration
5. **Observability**: Confirmed no special logging needed - pure function with errors at config load

These clarifications **simplify** the implementation:
- Removes need for elaborate migration guide
- Removes need for deprecation warnings or runtime notices
- Reduces documentation burden (no migration section in README)
- Confirms existing error handling patterns sufficient

## Notes

- Spec.md FR-002 needs minor update: Change "tool count" to "server count" for initialization instructions
- Constitution update required post-implementation (already noted in Constitution Check)
- Previous assumptions about MAJOR version bump and migration guide are superseded by clarifications
