/**
 * Environment variable expansion for configuration files
 * Supports ${VAR} and ${VAR:-default} syntax matching Claude Code implementation
 */

/**
 * Error thrown when environment variable expansion fails
 */
export class EnvExpansionError extends Error {
  constructor(
    public readonly variable: string,
    public readonly jsonPath: string,
    public readonly reason: string
  ) {
    const help = `Set the environment variable before starting server:\n  export ${variable}=value`;
    super(`Environment variable expansion failed
  Variable: ${variable}
  Location: ${jsonPath}
  Reason: ${reason}

${help}`);
    this.name = 'EnvExpansionError';
  }
}

/**
 * Regex pattern for matching environment variable references
 * - ${VAR} - required variable
 * - ${VAR:-default} - optional variable with default value
 *
 * Pattern breakdown:
 * - \$\{ - literal ${
 * - ([A-Z_][A-Z0-9_]*) - variable name (POSIX-compliant)
 * - (?::-(.*?))? - optional default value with :- separator (non-greedy)
 * - \} - literal }
 * - g - global flag (match all occurrences)
 */
const ENV_VAR_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g;

/**
 * Expand environment variable references in a single string
 * @param str - String potentially containing ${VAR} or ${VAR:-default} patterns
 * @param jsonPath - Dot-notation path for error reporting
 * @returns Expanded string with variables replaced
 * @throws EnvExpansionError when required variable is missing or syntax is malformed
 */
function expandString(str: string, jsonPath: string): string {
  // Check for malformed syntax (unclosed braces)
  if (str.includes('${') && !ENV_VAR_PATTERN.test(str)) {
    // Reset regex state for next test
    ENV_VAR_PATTERN.lastIndex = 0;

    // Check if it's an unclosed brace
    if (/\$\{[^}]*$/.test(str)) {
      throw new EnvExpansionError('', jsonPath, 'Malformed syntax: unclosed brace');
    }
  }

  // Reset regex state before replacement
  ENV_VAR_PATTERN.lastIndex = 0;

  return str.replace(ENV_VAR_PATTERN, (match, varName: string, defaultValue: string | undefined) => {
    // Validate variable name (POSIX-compliant)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(varName)) {
      if (/^[0-9]/.test(varName)) {
        throw new EnvExpansionError(varName, jsonPath, 'Variable name cannot start with digit');
      }
      throw new EnvExpansionError(
        varName,
        jsonPath,
        'Variable name must contain only uppercase letters, digits, and underscores'
      );
    }

    // Get environment variable value
    const envValue = process.env[varName];

    // Variable is set (even if empty string)
    if (envValue !== undefined) {
      return envValue;
    }

    // Variable is not set - use default if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // Required variable is missing
    throw new EnvExpansionError(varName, jsonPath, 'Variable is not set');
  });
}

/**
 * Recursively expand environment variables in configuration values
 * @param value - Value to expand (string, object, array, or primitive)
 * @param jsonPath - Dot-notation path for error reporting (default: "")
 * @returns Expanded value with same structure as input
 * @throws EnvExpansionError when expansion fails
 */
export function expandEnvVars(value: unknown, jsonPath: string = ""): unknown {
  // Base case: string - expand environment variable references
  if (typeof value === 'string') {
    return expandString(value, jsonPath);
  }

  // Base case: primitive (number, boolean, null, undefined) - return unchanged
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Recursive case: array - expand each element
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      expandEnvVars(item, `${jsonPath}[${index}]`)
    );
  }

  // Recursive case: object - expand keys and values
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    // Environment variables can be in object keys too
    const expandedKey = typeof key === 'string' ? expandString(key, `${jsonPath}.${key}`) : key;
    const newPath = jsonPath ? `${jsonPath}.${key}` : key;
    result[expandedKey] = expandEnvVars(val, newPath);
  }
  return result;
}
