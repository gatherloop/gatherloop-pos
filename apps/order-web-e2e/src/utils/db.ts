import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// docs/prd-order-web-push-notifications.md deliberately exposes web_push_subscriptions
// through no endpoint but the POST/DELETE the guest's own browser calls (see the
// three web-push routes in api.yaml — there is no "list my subscriptions" route), so
// a spec that needs to see the subscribe side effect has no HTTP path to it. This
// shells out to the mysql CLI against the same database apps/api writes to, the same
// way pos-web-e2e's utils/db.ts queries kds_notifications.
async function runMysql(sql: string): Promise<string[]> {
  const host = process.env['DB_HOST'] ?? '127.0.0.1';
  const port = process.env['DB_PORT'] ?? '3306';
  const user = process.env['DB_USERNAME'] ?? 'root';
  const password = process.env['DB_PASSWORD'] ?? '';
  const database = process.env['DB_NAME'];
  if (!database) {
    throw new Error('DB_NAME must be set to query web_push_subscriptions directly');
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
    sql,
  ];

  const { stdout } = await execFileAsync('mysql', args);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function countWebPushSubscriptionsForSession(
  sessionId: string
): Promise<number> {
  if (!UUID_V4_PATTERN.test(sessionId)) {
    throw new Error(`sessionId must be a UUIDv4, got ${sessionId}`);
  }

  const rows = await runMysql(
    `SELECT COUNT(*) FROM web_push_subscriptions WHERE session_id = '${sessionId}' AND deleted_at IS NULL;`
  );
  return Number(rows[0] ?? 0);
}
