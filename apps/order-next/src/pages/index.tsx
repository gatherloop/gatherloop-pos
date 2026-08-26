import { TableResolve } from '@gatherloop-pos/ui/order';

// A bare `/` (no code) is the "scan the QR at your table" screen (D17 in
// docs/prd-table-ordering.md) — same outcome as 404.tsx.
export default function Index() {
  return <TableResolve code={null} />;
}
