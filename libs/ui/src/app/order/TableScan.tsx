import { TableScanScreen } from '../../presentation/screens/order/TableScanScreen';

// Composition root for `/` and the unmatched-route fallback (D10 in
// docs/trd-order-app-composition-and-ssr.md), both landing on the
// scan-the-QR screen (D17 in docs/prd-table-ordering.md). No repositories
// and no usecases: with no table code there is nothing to resolve and no
// cart to interact with, so — unlike the other three roots — this one needs
// no session either.
export function TableScan() {
  return <TableScanScreen />;
}
