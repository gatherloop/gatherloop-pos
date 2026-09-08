import { TableScan } from '@gatherloop-pos/ui/order';

// A bare `/` (no code) is the "scan the QR at your table" screen (D17 in
// docs/prd-table-ordering.md) — same outcome as 404.tsx. No
// getServerSideProps: with no table there is no cart, so there is nothing
// to resolve or seed, and `TableScan` needs no session id (D10 in
// docs/trd-order-app-composition-and-ssr.md).
export default TableScan;
