# Feature Specification: Environment Variable Expansion in Configuration

**Feature Branch**: `003-env-var-expansion`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "support the identical env variable expansion mechanism in mcp-workbench mcp's configuration"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Credential Management (Priority: P1)

A developer wants to share their workbench configuration file in a team repository without exposing API tokens, database passwords, or other sensitive credentials. They need to externalize these secrets into environment variables while keeping the configuration structure in version control.

**Why this priority**: This is the most critical use case as it addresses security concerns and enables safe configuration sharing. Without this, teams must either expose secrets in config files or maintain separate, non-shareable configurations.

**Independent Test**: Can be fully tested by creating a workbench configuration with environment variable references for API tokens, setting those variables in the shell, and verifying the MCP server receives the expanded values without exposing secrets in the config file.

**Acceptance Scenarios**:

1. **Given** a workbench configuration contains `${API_KEY}` in an `env` field, **When** the API_KEY environment variable is set to "secret123", **Then** the downstream MCP server receives "secret123" as the API_KEY value
2. **Given** a workbench configuration contains `${DATABASE_PASSWORD}` in a `command` argument, **When** the DATABASE_PASSWORD is set, **Then** the server command is executed with the password substituted correctly
3. **Given** multiple environment variables are used in a single configuration file, **When** all variables are set, **Then** all values are substituted correctly throughout the configuration

---

### User Story 2 - Cross-Platform Path Handling (Priority: P2)

A team with members using different operating systems (macOS, Linux, Windows) needs to share a workbench configuration that references file paths. Each developer's paths differ (e.g., `/Users/alice` vs `/home/bob` vs `C:\Users\carol`), so they want to use environment variables for machine-specific paths.

**Why this priority**: This enables true cross-platform configuration sharing, which is common in diverse development teams. It's secondary to security but essential for team collaboration.

**Independent Test**: Can be tested by configuring a server with `${HOME}/path/to/server` and verifying it works correctly on different machines with different HOME values.

**Acceptance Scenarios**:

1. **Given** a configuration uses `${HOME}/tools/server.js` as a command path, **When** HOME is set to `/Users/alice`, **Then** the server is launched from `/Users/alice/tools/server.js`
2. **Given** a configuration uses `${PROJECT_ROOT}/config.json` in arguments, **When** PROJECT_ROOT varies by developer, **Then** each developer's server loads their local config correctly
3. **Given** path separators differ by OS, **When** environment variables contain OS-appropriate paths, **Then** the configuration works on all platforms without modification

---

### User Story 3 - Environment-Specific Configuration (Priority: P3)

A developer maintains multiple deployment environments (development, staging, production) and wants to use the same workbench configuration structure while pointing to different backend services or using different credentials per environment.

**Why this priority**: This is valuable for advanced use cases but less common than security and cross-platform needs. Most users won't need multi-environment configurations immediately.

**Independent Test**: Can be tested by setting different environment variable values and verifying the configuration dynamically adapts to connect to different services without file changes.

**Acceptance Scenarios**:

1. **Given** a configuration uses `${API_ENDPOINT}` for a server URL, **When** API_ENDPOINT is set to "https://dev.api.com", **Then** the server connects to the development environment
2. **Given** the same configuration with API_ENDPOINT changed to "https://prod.api.com", **When** the workbench starts, **Then** the server connects to production without config file changes
3. **Given** multiple environment variables control different aspects (URLs, credentials, timeouts), **When** switching environments, **Then** all related settings adjust appropriately

---

### User Story 4 - Default Values for Optional Settings (Priority: P3)

A developer wants to provide a workbench configuration that works out-of-the-box for most users while allowing customization through environment variables. They need fallback values when optional environment variables aren't set.

**Why this priority**: This improves user experience by supporting both simple and advanced use cases, but it's not essential for basic functionality.

**Independent Test**: Can be tested by using `${VAR:-default}` syntax in a configuration and verifying the default is used when VAR is unset, while the variable value is used when set.

**Acceptance Scenarios**:

1. **Given** a configuration uses `${LOG_LEVEL:-info}`, **When** LOG_LEVEL is not set, **Then** the server uses "info" as the log level
2. **Given** the same configuration, **When** LOG_LEVEL is set to "debug", **Then** the server uses "debug" instead of the default
3. **Given** multiple settings with defaults, **When** some variables are set and others aren't, **Then** the configuration uses environment values where available and defaults otherwise

---

### Edge Cases

- What happens when a required environment variable is not set and has no default value?
- How does the system handle environment variables that contain special characters (spaces, quotes, shell metacharacters)?
- What happens if an environment variable value itself contains the expansion syntax (e.g., `${INNER_VAR}`)?
- How are empty string values handled differently from unset variables?
- What happens when the syntax is malformed (e.g., unclosed braces like `${VAR`)?
- How does the system handle very long environment variable values (e.g., multi-line certificates)?
- What happens when multiple environment variables are used in a single field value?
- How are numeric values vs string values handled in environment variables?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support `${VAR}` syntax for environment variable substitution in configuration files
- **FR-002**: System MUST support `${VAR:-default}` syntax for environment variables with fallback values
- **FR-003**: System MUST expand environment variables in the `command` field of server configurations
- **FR-004**: System MUST expand environment variables in the `args` array of server configurations
- **FR-005**: System MUST expand environment variables in the `env` object keys and values of server configurations
- **FR-006**: System MUST expand environment variables in the `url` field for HTTP-based servers
- **FR-007**: System MUST expand environment variables in the `headers` object for HTTP-based servers
- **FR-008**: System MUST fail configuration parsing with a clear error message when a required environment variable (without default) is not set
- **FR-009**: System MUST preserve literal `${VAR}` syntax if expansion is disabled or escaped
- **FR-010**: System MUST handle multiple environment variable references within a single configuration field value
- **FR-011**: System MUST validate that default values in `${VAR:-default}` syntax don't contain unmatched braces or invalid characters
- **FR-012**: System MUST process environment variable expansion before validating the final configuration schema
- **FR-013**: System MUST support environment variables containing spaces, special characters, and multi-line values
- **FR-014**: System MUST treat empty string environment variable values as valid (distinct from unset variables)

### Non-Functional Requirements

- **NFR-001**: Environment variable expansion MUST occur at configuration load time, not at server connection time
- **NFR-002**: Error messages for missing environment variables MUST indicate which variable is missing and in which configuration location
- **NFR-003**: The expansion mechanism MUST be consistent with the Claude Code implementation as documented in the MCP documentation
- **NFR-004**: Performance overhead of environment variable expansion MUST be negligible (< 10ms for typical configurations)

### Key Entities *(include if feature involves data)*

- **Configuration Variable Reference**: A placeholder in the configuration file using `${VAR}` or `${VAR:-default}` syntax that will be replaced with an environment variable value
- **Environment Variable**: A system-level variable containing a string value that will be substituted into the configuration
- **Default Value**: An optional fallback value specified after `:-` in the variable reference syntax, used when the environment variable is not set

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully share workbench configurations in version control without exposing any sensitive credentials
- **SC-002**: Configuration files with environment variables work identically across different operating systems (macOS, Linux, Windows) without modification
- **SC-003**: 100% of supported configuration fields (`command`, `args`, `env`, `url`, `headers`) correctly expand environment variables
- **SC-004**: Configuration parsing fails immediately with actionable error messages when required environment variables are missing
- **SC-005**: Users can set up a working configuration with environment variables in under 5 minutes following documentation examples

## Assumptions

- Environment variables are set in the shell/process environment before the workbench server starts
- The workbench configuration schema already supports all field types that need expansion (`command`, `args`, `env`, `url`, `headers`)
- The expansion mechanism will follow POSIX-style shell variable syntax, matching Claude Code's implementation
- Recursive expansion (environment variables referencing other environment variables) is not required
- The feature will not support advanced shell features like command substitution or arithmetic expansion
- Configuration file format remains JSON (does not need to support other formats like YAML or TOML)
- Error handling will fail-fast rather than attempting partial configuration loading

## Constraints

- Must maintain backward compatibility with existing configuration files that don't use environment variables
- Must not introduce dependencies on shell-specific environment variable expansion utilities
- Must work consistently across all supported platforms (macOS, Linux, Windows)
- Must complete configuration loading within existing startup time constraints

## Dependencies

- Configuration loading system must be modified to process environment variables before schema validation
- Documentation must be updated to explain environment variable syntax and provide examples
- Test configurations must be created to verify environment variable expansion across different scenarios
