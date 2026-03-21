/**
 * Playwright Global Teardown
 *
 * Runs once after the entire test suite completes.
 * Currently a no-op — test data cleanup is handled per-spec in afterAll hooks
 * via the API helpers in utils/api.ts.
 *
 * This file exists as an extension point for future global cleanup tasks
 * (e.g. wiping a test-only database schema, rotating test credentials, etc.).
 */

import type { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig) {
  // No global teardown needed — each spec manages its own test data cleanup.
  // Add global cleanup logic here if required in future phases.
}
