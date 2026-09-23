export type Customer = {
  name: string;
  whatsappNumber: string;
};

const WHATSAPP_NUMBER_SEPARATORS = /[ \-.()]/g;

export function normalizeWhatsappNumber(raw: string): string | null {
  const stripped = raw.replace(WHATSAPP_NUMBER_SEPARATORS, '');

  let normalized: string;
  if (stripped.startsWith('0')) {
    normalized = '62' + stripped.slice(1);
  } else if (stripped.startsWith('+')) {
    normalized = stripped.slice(1);
  } else {
    normalized = stripped;
  }

  if (normalized === '' || !/^\d+$/.test(normalized)) return null;

  if (normalized.startsWith('62')) {
    if (normalized.length < 3 || normalized[2] !== '8') return null;
    if (normalized.length < 10 || normalized.length > 15) return null;
    return normalized;
  }

  if (normalized.length < 8 || normalized.length > 15) return null;

  return normalized;
}

export function formatWhatsappNumberForInput(normalized: string): string {
  if (normalized.startsWith('62')) return '0' + normalized.slice(2);
  return normalized;
}
