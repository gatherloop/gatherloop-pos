import { match } from 'ts-pattern';
// Deep import, not the `components/base` barrel (D20): that barrel also
// re-exports POS-only components the customer bundle does not ship (D6).
import { EmptyView } from '../../components/base/EmptyView';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type CheckoutScreenProps = {
  // D9 in docs/trd-order-app-composition-and-ssr.md: this screen renders its
  // own table shell now (formerly `TableResolve`, a wrapper root) — the same
  // shape `CartScreen`/`MenuListScreen` render it in. No footer (unlike
  // `MenuListScreen`): the floating cart bar has no place on this screen,
  // the same way `CartScreen` renders none.
  tableVariant: TableResolveScreenProps['variant'];
  enabled: boolean;
  onBackToCartPress: () => void;
};

// FR-8 in docs/prd-table-ordering.md: `/order/t/{code}/checkout`. This
// screen creates nothing — no API call, no transaction (D10) — it only
// tells the guest that payment is QRIS-only and their order has not been
// sent to the kitchen yet. `enabled` mirrors
// `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (D10, default false): when the flag is
// off, the route stays reachable from the cart's Checkout button but shows
// a "not available" message instead of the QRIS copy, so the kill switch
// needs no change to `CartScreen`.
export const CheckoutScreen = ({
  tableVariant,
  enabled,
  onBackToCartPress,
}: CheckoutScreenProps) => (
  <TableResolveScreen variant={tableVariant}>
    {match(enabled)
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
      .exhaustive()}
  </TableResolveScreen>
);
