// The customer ordering app is a Next.js app hosted on its own origin,
// separate from the POS (D3/D6 in docs/trd-order-app-nextjs-migration.md).
// A table's QR code must encode that origin so scanning it opens the menu
// directly, not just the bare table code. The origin is read from an env
// var rather than hardcoded so moving hosts later — as happened once
// already, off GitHub Pages — is a config change, not a code change.
export function getTableOrderUrl(code: string): string {
  const baseUrl = process.env['NEXT_PUBLIC_ORDER_APP_BASE_URL'] ?? '';
  return `${baseUrl}/t/${code}`;
}
