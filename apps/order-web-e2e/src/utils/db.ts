import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// docs/prd-order-whatsapp-notifications.md deliberately never exposes
// guest_notifications or payments.access_key over the API (there is no "list
// my notifications" or "read my access key" route in api.yaml), so a spec
// that needs to see the outbox side effect of marking an order ready has no
// HTTP path to it. This shells out to the mysql CLI against the same
// database apps/api writes to, the same way pos-web-e2e's utils/db.ts
// queries kds_notifications.
async function runMysql(sql: string): Promise<string[][]> {
  const host = process.env['DB_HOST'] ?? '127.0.0.1';
  const port = process.env['DB_PORT'] ?? '3306';
  const user = process.env['DB_USERNAME'] ?? 'root';
  const password = process.env['DB_PASSWORD'] ?? '';
  const database = process.env['DB_NAME'];
  if (!database) {
    throw new Error('DB_NAME must be set to query the database directly');
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
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t'));
}

export interface GuestNotificationRow {
  status: string;
  whatsappNumber: string | null;
  detail: string | null;
}

export async function getGuestNotificationsForTransaction(
  transactionId: number
): Promise<GuestNotificationRow[]> {
  if (!Number.isInteger(transactionId)) {
    throw new Error(`transactionId must be an integer, got ${transactionId}`);
  }

  const rows = await runMysql(
    `SELECT status, whatsapp_number, detail FROM guest_notifications WHERE transaction_id = ${transactionId};`
  );
  return rows.map(([status, whatsappNumber, detail]) => ({
    status,
    whatsappNumber: whatsappNumber === 'NULL' ? null : whatsappNumber,
    detail: detail === 'NULL' ? null : detail,
  }));
}

const PARTNER_REFERENCE_NO_PATTERN = /^[A-Za-z0-9-]+$/;

export async function getPaymentAccessKey(
  partnerReferenceNo: string
): Promise<string> {
  if (!PARTNER_REFERENCE_NO_PATTERN.test(partnerReferenceNo)) {
    throw new Error(`unexpected partnerReferenceNo: ${partnerReferenceNo}`);
  }

  const rows = await runMysql(
    `SELECT access_key FROM payments WHERE partner_reference_no = '${partnerReferenceNo}';`
  );
  const accessKey = rows[0]?.[0];
  if (!accessKey || accessKey === 'NULL') {
    throw new Error(`no access_key found for payment ${partnerReferenceNo}`);
  }
  return accessKey;
}
