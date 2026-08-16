// The customer ordering app is a static SPA published to GitHub Pages
// alongside docs-site, under an /order base path (D17/D18 in
// docs/prd-table-ordering.md). A table's QR code must encode this full URL
// so scanning it opens the menu directly, not just the bare table code.
const TABLE_ORDER_BASE_URL = 'https://gatherloop.github.io/gatherloop-pos/order/t';

export function getTableOrderUrl(code: string): string {
  return `${TABLE_ORDER_BASE_URL}/${code}`;
}
