import type { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig) {
  // No global teardown needed — each spec manages its own test data cleanup.
  // Add global cleanup logic here if required in future phases.
}
