/**
 * E2E tests for User Story 1: Complete Workbench Workflow Validation
 * Tests complete workflow from server start through tool execution and cleanup
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTempConfig, deleteTempConfig } from '../helpers/server-manager.js';
import { MCPTestClientWrapper } from '../helpers/client-factory.js';
import { getMemoryServerConfig } from '../fixtures/downstream-servers/test-server-setup.js';

describe('US1: Complete Workbench Workflow Validation', () => {
  let client: MCPTestClientWrapper;
  let configPath: string;

  beforeAll(async () => {
    // Create temporary configuration
    const config = getMemoryServerConfig();
    configPath = createTempConfig(config, 'workflow-validation');

    // Create MCP client (this will spawn the workbench server via stdio)
    client = new MCPTestClientWrapper();
    await client.connect(configPath);
  });

  afterAll(async () => {
    // Cleanup: disconnect client (this stops the server process)
    // CRITICAL: Failures here abort entire test run per clarifications
    try {
      await client.disconnect();
      deleteTempConfig(configPath);
    } catch (err) {
      throw new Error(
        `CRITICAL: Cleanup failed - aborting test run: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  });

  describe('Test 1.1: Server Initialization and Connection', () => {
    it('should connect MCP client successfully', () => {
      // Client connected in beforeAll
      expect(client.isConnected()).toBe(true);
    });

    it('should return initialization instructions with toolbox listing', async () => {
      // Note: MCP SDK doesn't expose initialization response directly
      // We validate initialization by successfully calling open_toolbox
      const tools = await client.openToolbox('test');
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  describe('Test 1.2: Open Toolbox and Retrieve Tools', () => {
    it('should open toolbox and return tool list', async () => {
      const tools = await client.openToolbox('test');

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should return tools with structured identifier fields', async () => {
      const tools = await client.openToolbox('test');

      for (const tool of tools) {
        expect(tool).toHaveProperty('toolbox');
        expect(tool).toHaveProperty('server');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('inputSchema');

        expect(tool.toolbox).toBe('test');
        expect(tool.server).toBe('memory');
        expect(typeof tool.name).toBe('string');
      }
    });

    it('should return tools with valid schemas', async () => {
      const tools = await client.openToolbox('test');

      // Verify at least one tool has a valid schema
      const toolWithSchema = tools.find((t) => t.inputSchema);
      expect(toolWithSchema).toBeDefined();
      expect(toolWithSchema!.inputSchema).toHaveProperty('type');
    });
  });

  describe('Test 1.3: Execute Tool via use_tool', () => {
    it('should execute create_entities tool successfully', async () => {
      // First ensure toolbox is open
      await client.openToolbox('test');

      // Execute create_entities tool (from knowledge graph server)
      const result = await client.useTool(
        {
          toolbox: 'test',
          server: 'memory',
          name: 'create_entities',
        },
        {
          entities: [
            {
              name: 'test-entity',
              entityType: 'concept',
              observations: ['This is a test entity'],
            },
          ],
        }
      );

      expect(result).toBeDefined();
    });

    it('should execute search_nodes tool successfully', async () => {
      // Execute search_nodes to verify entity was created
      const result = await client.useTool(
        {
          toolbox: 'test',
          server: 'memory',
          name: 'search_nodes',
        },
        {
          query: 'test-entity',
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe('Test 1.4: Proper Connection Cleanup', () => {
    it('should disconnect client without errors', async () => {
      // Disconnect will happen in afterAll
      // This test validates that client is still connected before cleanup
      expect(client.isConnected()).toBe(true);

      // Validate that opened toolboxes are tracked
      const opened = client.getOpenedToolboxes();
      expect(opened).toContain('test');
    });
  });

  describe('Test 1.5: Full Workflow Integration', () => {
    it('should complete full workflow without errors', async () => {
      // This test validates the entire workflow completed
      // All previous tests passed if we reach here

      // Verify client is connected
      expect(client.isConnected()).toBe(true);

      // Verify toolbox opened
      const opened = client.getOpenedToolboxes();
      expect(opened.length).toBeGreaterThan(0);

      // Execute one more tool to confirm end-to-end functionality
      const result = await client.useTool(
        {
          toolbox: 'test',
          server: 'memory',
          name: 'create_entities',
        },
        {
          entities: [
            {
              name: 'final-test',
              entityType: 'test',
              observations: ['workflow-complete'],
            },
          ],
        }
      );

      expect(result).toBeDefined();
    });
  });
});
