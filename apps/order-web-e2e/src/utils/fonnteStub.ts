const FONNTE_STUB_URL =
  process.env['FONNTE_STUB_URL'] || 'http://127.0.0.1:8091';

// cmd/fonntestub reports a number ending in these digits as not_registered,
// and everything else as registered (docs/prd-order-whatsapp-number-validation.md phase 8).
export const NOT_REGISTERED_WHATSAPP_NUMBER = '081200000000';

export async function getValidateCallCount(
  normalizedWhatsappNumber: string
): Promise<number> {
  const response = await fetch(
    `${FONNTE_STUB_URL}/_stub/calls/${normalizedWhatsappNumber}`
  );
  if (!response.ok) {
    throw new Error(
      `GET /_stub/calls/${normalizedWhatsappNumber} failed: ${response.status} ${await response.text()}`
    );
  }
  const { calls } = (await response.json()) as { calls: number };
  return calls;
}
