import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['e2e/**/*.e2e.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds per test (per performance goals)
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks
    pool: 'forks', // Use forked processes for test isolation
    poolOptions: {
      forks: {
        singleFork: false, // Enable parallel execution
      },
    },
    // Sequential by default to avoid port conflicts, but tests can run in parallel
    // when using proper isolation (allocatePort helper)
    fileParallelism: false,
    isolate: true, // Each test file runs in isolated context
  },
});
