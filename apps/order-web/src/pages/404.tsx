import { TableResolve } from '@gatherloop-pos/ui/order';

// Any unmatched path falls back to the "scan the QR at your table" screen
// (D17 in docs/prd-table-ordering.md) rather than a dedicated 404 — same
// outcome as index.tsx. Unlike every other route, this page has no
// getServerSideProps: Next statically optimizes `pages/404` and rejects
// data fetching on it, so it never gets a server-resolved session id.
// `TableResolve`'s `sessionId` prop is optional for exactly this
// case — `CookieSessionRepository` mints one client-side instead (D4).
export default function NotFound() {
  return <TableResolve code={null} />;
}
