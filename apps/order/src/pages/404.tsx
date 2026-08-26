import { TableResolve } from '@gatherloop-pos/ui/order';

// Any unmatched path falls back to the "scan the QR at your table" screen
// (D17 in docs/prd-table-ordering.md) rather than a dedicated 404 — same
// outcome as index.tsx.
export default function NotFound() {
  return <TableResolve code={null} />;
}
