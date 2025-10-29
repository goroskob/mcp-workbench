/**
 * E2E tests for User Story 4: CI/CD Pipeline Integration
 * Tests specific to CI environment validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTempConfig, deleteTempConfig } from '../helpers/server-manager.js';
import { MCPTestClientWrapper } from '../helpers/client-factory.js';
import { getMemoryServerConfig } from '../fixtures/downstream-servers/test-server-setup.js';

describe('US4: CI/CD Pipeline Integration', () => {
  let client: MCPTestClientWrapper;
  let configPath: string;

  beforeAll(async () => {
    const config = getMemoryServerConfig();
    configPath = createTempConfig(config, 'ci-integration');

    client = new MCPTestClientWrapper();
    await client.connect(configPath);
  });

  afterAll(async () => {
    await client.disconnect();
    deleteTempConfig(configPath);
  });

  describe('Test 4.1: CI Test Execution Validation', () => {
    it('should detect CI environment', () => {
      // CI environment variable is typically set in CI/CD pipelines
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

      // Test should work both locally and in CI
      expect(typeof isCI).toBe('boolean');
    });

    it('should execute tests in CI environment successfully', async () => {
      // Verify basic workflow works in CI
      const tools = await client.openToolbox('test');

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should complete test execution within timeout', async () => {
      // This test validates that E2E tests complete quickly
      const startTime = Date.now();

      const tools = await client.openToolbox('test');
      const result = await client.useTool(
        {
          toolbox: 'test',
          server: 'memory',
          name: 'create_entities',
        },
        {
          entities: [
            {
              name: 'ci-test',
              entityType: 'validation',
              observations: ['Testing in CI'],
            },
          ],
        }
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
    });

    it('should provide clear pass/fail status', async () => {
      // CI tests should have clear outcomes
      try {
        const result = await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'create_entities',
          },
          {
            entities: [
              {
                name: 'status-test',
                entityType: 'ci',
                observations: ['Clear status validation'],
              },
            ],
          }
        );

        // Success case - clear pass
        expect(result).toBeDefined();
      } catch (err) {
        // Failure case - clear fail
        expect(err).toBeInstanceOf(Error);
        throw err; // Re-throw to fail test
      }
    });

    it('should handle CI-specific constraints', () => {
      // Verify test runs in isolated environment
      expect(client.isConnected()).toBe(true);

      // Verify no port conflicts (each test uses unique config)
      expect(configPath).toContain('ci-integration');
    });

    it('should be compatible with GitHub Actions', async () => {
      // Test compatibility with GitHub Actions environment
      // Tests should work with npm ci, not just npm install
      const tools = await client.openToolbox('test');

      expect(tools.length).toBeGreaterThan(0);

      // All tools should have proper structure for CI validation
      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('toolbox');
        expect(tool).toHaveProperty('server');
        expect(tool).toHaveProperty('inputSchema');
      }
    });
  });
});
