import { match } from 'ts-pattern';
import { EmptyView } from '../../components/base/EmptyView';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type CheckoutScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  enabled: boolean;
  onBackToCartPress: () => void;
};

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
