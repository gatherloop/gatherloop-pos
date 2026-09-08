import { TableScan } from '@gatherloop-pos/ui/order';

// Any unmatched path falls back to the "scan the QR at your table" screen
// (D17 in docs/prd-table-ordering.md) rather than a dedicated 404 — same
// outcome as index.tsx. Next statically optimizes `pages/404` and rejects
// data fetching on it, which no longer matters here: `TableScan` needs no
// session id at all (D10 in docs/trd-order-app-composition-and-ssr.md).
export default TableScan;
