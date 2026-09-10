/**
 * Talks to apps/api/cmd/dokustub, the throwaway stand-in for DOKU started
 * alongside the real API for this spec only (phase 13 in
 * docs/prd-order-checkout-qris-doku.md). markPaid is the one endpoint that
 * isn't part of DOKU's own surface — it flips the stubbed payment to paid
 * and pushes a correctly signed notification to the real API's
 * `/payments/doku/notification`, exactly as DOKU's webhook would, standing
 * in for a guest completing the QRIS payment on their banking app.
 */

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
