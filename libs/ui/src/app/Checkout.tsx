import { CheckoutHandler } from '../presentation/screens/CheckoutHandler';

export type CheckoutProps = {
  tableCode: string;
};

// Composition root for the QRIS checkout stub (FR-8 phase 11), mounted at
// `t/{code}/checkout` inside `TableResolve`, the same way `Cart` is.
// `CartScreen`'s Checkout button always routes here regardless of the flag
// (D10) — `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (D8 in
// docs/trd-order-app-nextjs-migration.md) only decides which message this
// screen shows, so a real checkout can be swapped in later without touching
// `CartScreen`.
export function Checkout({ tableCode }: CheckoutProps) {
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';
  return <CheckoutHandler enabled={enabled} tableCode={tableCode} />;
}
