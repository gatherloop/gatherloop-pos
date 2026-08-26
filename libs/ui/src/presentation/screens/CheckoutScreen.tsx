import { match } from 'ts-pattern';
// Deep import, not the `components/base` barrel (D20): that barrel also
// re-exports POS-only components the customer bundle does not ship (D6).
import { EmptyView } from '../components/base/EmptyView';

export type CheckoutScreenProps = {
  enabled: boolean;
  onBackToCartPress: () => void;
};

// FR-8 in docs/prd-table-ordering.md: `/order/t/{code}/checkout`. This
// screen creates nothing — no API call, no transaction (D10) — it only
// tells the guest that payment is QRIS-only and their order has not been
// sent to the kitchen yet. Mounted inside `TableResolve` like `CartScreen`
// (see `app/Checkout.tsx`), so the header/footer chrome comes from there
// and this component only owns its body content. `enabled` mirrors
// `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (D10, default false): when the flag is
// off, the route stays reachable from the cart's Checkout button but shows
// a "not available" message instead of the QRIS copy, so the kill switch
// needs no change to `CartScreen`.
export const CheckoutScreen = ({
  enabled,
  onBackToCartPress,
}: CheckoutScreenProps) =>
  match(enabled)
    .with(true, () => (
      <EmptyView
        title="Pembayaran QRIS — segera hadir"
        subtitle="Pesanan Anda belum dikirim ke dapur. Saat ini kami hanya menerima pembayaran QRIS, dan fitur checkout akan segera hadir."
        actionLabel="Kembali ke keranjang"
        onActionPress={onBackToCartPress}
      />
    ))
    .with(false, () => (
      <EmptyView
        title="Checkout belum tersedia"
        subtitle="Fitur ini belum diaktifkan untuk meja Anda."
        actionLabel="Kembali ke keranjang"
        onActionPress={onBackToCartPress}
      />
    ))
    .exhaustive();
