import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// docs/prd-kds-order-notifications.md D24/FR-3 deliberately never expose
// kds_notifications over the API (see the KDS device routes in api.yaml —
// there is no equivalent for notifications), so a spec that needs to see the
// enqueue side effect of a payment has no HTTP path to it. This shells out to
// the mysql CLI against the same database apps/api writes to, the same way
// e2e-main.yml itself seeds data it has no endpoint for.
export async function getKdsNotificationStatuses(
  transactionId: number
): Promise<string[]> {
  if (!Number.isInteger(transactionId)) {
    throw new Error(`transactionId must be an integer, got ${transactionId}`);
  }

  const host = process.env['DB_HOST'] ?? '127.0.0.1';
  const port = process.env['DB_PORT'] ?? '3306';
  const user = process.env['DB_USERNAME'] ?? 'root';
  const password = process.env['DB_PASSWORD'] ?? '';
  const database = process.env['DB_NAME'];
  if (!database) {
    throw new Error('DB_NAME must be set to query kds_notifications directly');
  }

  const args = [
    '-h', host,
    '-P', port,
    '-u', user,
    ...(password ? [`-p${password}`] : []),
    '-N',
    '-B',
    database,
    '-e',
    `SELECT status FROM kds_notifications WHERE transaction_id = ${transactionId};`,
  ];

  const { stdout } = await execFileAsync('mysql', args);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
