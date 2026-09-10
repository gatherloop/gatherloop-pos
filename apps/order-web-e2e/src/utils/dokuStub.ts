const DOKU_STUB_URL = process.env['DOKU_STUB_URL'] || 'http://127.0.0.1:8090';

export async function markPaid(partnerReferenceNo: string): Promise<void> {
  const response = await fetch(`${DOKU_STUB_URL}/_stub/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partnerReferenceNo }),
  });
  if (!response.ok) {
    throw new Error(
      `POST /_stub/pay failed: ${response.status} ${await response.text()}`
    );
  }
}
