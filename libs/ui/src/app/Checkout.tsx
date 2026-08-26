import { CheckoutHandler } from '../presentation/screens/CheckoutHandler';

// Populated only by apps/order's Vite `define` config (D10/FR-8 in
// docs/prd-table-ordering.md). Same `typeof`-guarded build-time global
// pattern as `libs/api-contract/src/client.ts`'s `__VITE_API_BASE_URL__` —
// resolves to `undefined` under Jest/ts-jest and any non-Vite bundler, so
// this file stays safe to import from tests. Read alongside
// `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (D8 in
// docs/trd-order-app-nextjs-migration.md) while apps/order-next and the Vite
// apps/order coexist; the Vite global is dropped once apps/order is deleted.
declare const __VITE_ORDER_CHECKOUT_ENABLED__: boolean | undefined;

export type CheckoutProps = {
  tableCode: string;
};

// Composition root for the QRIS checkout stub (FR-8 phase 11), mounted at
// `/order/t/{code}/checkout` inside `TableResolve`, the same way `Cart` is
// (see `apps/order/src/app/app.tsx`). `CartScreen`'s Checkout button always
// routes here regardless of the flag (D10) — the flag only decides which
// message this screen shows, so a real checkout can be swapped in later
// without touching `CartScreen`.
export function Checkout({ tableCode }: CheckoutProps) {
  const enabled =
    process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true' ||
    (__VITE_ORDER_CHECKOUT_ENABLED__ ?? false);
  return <CheckoutHandler enabled={enabled} tableCode={tableCode} />;
}
