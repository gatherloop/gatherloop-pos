/**
 * Playwright Global Teardown
 *
 * Closes the authenticated API context opened lazily by utils/api.ts for
 * seeding/cleaning up test data — per-spec `afterAll` hooks already delete
 * the rows themselves, this just releases the underlying connection.
 */

import { disposeApiContext } from './utils/api';

export default async function globalTeardown() {
  await disposeApiContext();
}
