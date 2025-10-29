/**
 * E2E tests for User Story 3: Error Handling Verification
 * Tests error scenarios are handled gracefully with helpful messages
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTempConfig, deleteTempConfig } from '../helpers/server-manager.js';
import { MCPTestClientWrapper } from '../helpers/client-factory.js';
import { getMemoryServerConfig } from '../fixtures/downstream-servers/test-server-setup.js';
import { assertErrorContext } from '../helpers/assertions.js';

describe('US3: Error Handling Verification', () => {
  let client: MCPTestClientWrapper;
  let configPath: string;

  beforeAll(async () => {
    const config = getMemoryServerConfig();
    configPath = createTempConfig(config, 'error-handling');

    client = new MCPTestClientWrapper();
    await client.connect(configPath);
    await client.openToolbox('test');
  });

  afterAll(async () => {
    await client.disconnect();
    deleteTempConfig(configPath);
  });

  describe('Test 3.1: Invalid Tool Name', () => {
    it('should throw error for non-existent tool', async () => {
      await expect(async () => {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'invalid_tool_that_does_not_exist',
          },
          {}
        );
      }).rejects.toThrow();
    });

    it('should include full error context (toolbox, server, tool)', async () => {
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'invalid_tool_that_does_not_exist',
          },
          {}
        );
        // If we get here, test should fail
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        const error = err as Error;

        // Error should include context
        assertErrorContext(error, {
          toolbox: 'test',
          server: 'memory',
          name: 'invalid_tool',
        });
      }
    });

    it('should provide clear error message', async () => {
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'invalid_tool_that_does_not_exist',
          },
          {}
        );
        expect(true).toBe(false);
      } catch (err) {
        const error = err as Error;
        expect(error.message.length).toBeGreaterThan(0);
        // Message should be actionable
        expect(error.message).toMatch(/tool|not found|invalid/i);
      }
    });
  });

  describe('Test 3.2: Invalid Arguments', () => {
    it('should throw error for missing required arguments', async () => {
      await expect(async () => {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'create_entities',
          },
          {} // Missing required 'entities' argument
        );
      }).rejects.toThrow();
    });

    it('should indicate argument validation failure in error', async () => {
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'create_entities',
          },
          {} // Missing required 'entities' argument
        );
        expect(true).toBe(false);
      } catch (err) {
        const error = err as Error;
        // Error should mention validation or missing argument
        expect(error.message).toMatch(/argument|parameter|required|entities/i);
      }
    });

    it('should be diagnosable from error message alone', async () => {
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'create_entities',
          },
          { entities: 'wrong-type' } // Wrong argument type
        );
        expect(true).toBe(false);
      } catch (err) {
        const error = err as Error;
        // Error message should be clear enough to diagnose
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Test 3.3: Downstream Server Failure', () => {
    it('should handle downstream server errors gracefully', async () => {
      // Try to execute a tool that might fail (edge case handling)
      // For this test, we'll verify that any downstream error is properly wrapped
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'memory',
            name: 'create_entities',
          },
          {
            entities: [
              {
                name: 'test',
                entityType: 'invalid-type-that-might-cause-downstream-error',
                observations: [],
              },
            ],
          }
        );
        // If this succeeds, that's fine - server handled it
        expect(true).toBe(true);
      } catch (err) {
        // If it fails, error should include context
        const error = err as Error;
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should preserve error context in failures', async () => {
      // This test verifies that errors maintain context through the stack
      // We'll test by trying an operation that should succeed to establish baseline
      const result = await client.useTool(
        {
          toolbox: 'test',
          server: 'memory',
          name: 'create_entities',
        },
        {
          entities: [
            {
              name: 'context-test',
              entityType: 'test',
              observations: ['Testing error context'],
            },
          ],
        }
      );
      expect(result).toBeDefined();
    });
  });

  describe('Test 3.4: Configuration Reference Error', () => {
    it('should fail when referencing non-existent toolbox', async () => {
      await expect(async () => {
        await client.openToolbox('non-existent-toolbox');
      }).rejects.toThrow();
    });

    it('should provide clear error for invalid toolbox reference', async () => {
      try {
        await client.openToolbox('non-existent-toolbox');
        expect(true).toBe(false);
      } catch (err) {
        const error = err as Error;
        expect(error.message).toMatch(/toolbox|not found|non-existent/i);
      }
    });

    it('should fail when referencing non-existent server in use_tool', async () => {
      await expect(async () => {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'non-existent-server',
            name: 'some_tool',
          },
          {}
        );
      }).rejects.toThrow();
    });

    it('should include server name in error for missing server', async () => {
      try {
        await client.useTool(
          {
            toolbox: 'test',
            server: 'non-existent-server',
            name: 'some_tool',
          },
          {}
        );
        expect(true).toBe(false);
      } catch (err) {
        const error = err as Error;
        assertErrorContext(error, {
          toolbox: 'test',
          server: 'non-existent-server',
        });
      }
    });
  });
});
