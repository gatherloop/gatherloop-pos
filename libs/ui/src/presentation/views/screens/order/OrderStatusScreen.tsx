import { ReactNode } from 'react';
import { CheckCircle } from '@tamagui/lucide-icons';
import { match } from 'ts-pattern';
import { Button, Text, XStack, YStack } from 'tamagui';
import { Payment } from '../../../../domain/entities/Payment';
import { formatRupiah } from '../../../../utils/currency';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type OrderStatusScreenVariant =
  | { type: 'loading' }
  | { type: 'loaded'; payment: Payment }
  | { type: 'notFound' }
  | { type: 'error'; onRetryPress: () => void };

export type OrderStatusScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  variant: OrderStatusScreenVariant;
  onBackToMenuPress: () => void;
};

export const OrderStatusScreen = ({
  tableVariant,
  variant,
  onBackToMenuPress,
}: OrderStatusScreenProps) => (
  <TableResolveScreen variant={tableVariant}>
    {match(variant)
      .returnType<ReactNode>()
      .with({ type: 'loading' }, () => (
        <LoadingView title="Memuat status pesanan..." />
      ))
      .with({ type: 'notFound' }, () => (
        <EmptyView
          title="Pesanan tidak ditemukan"
          subtitle="Pesanan ini tidak dapat ditemukan."
          actionLabel="Kembali ke menu"
          onActionPress={onBackToMenuPress}
        />
      ))
      .with({ type: 'error' }, ({ onRetryPress }) => (
        <ErrorView
          title="Gagal memuat pesanan"
          subtitle="Terjadi kesalahan. Silakan coba lagi."
          onRetryButtonPress={onRetryPress}
        />
      ))
      .with({ type: 'loaded' }, ({ payment }) => (
        <YStack flex={1} gap="$4" alignItems="center">
          <CheckCircle size="$6" color="$green10" />
          <Text fontWeight="bold" fontSize="$6" textAlign="center">
            Pesanan Anda sedang disiapkan
          </Text>

          <YStack alignItems="center" gap="$1">
            <Text color="$color10">Meja</Text>
            <Text fontWeight="bold" fontSize="$10" textAlign="center">
              {payment.tableLabel}
            </Text>
          </YStack>

          <Text color="$color10">Atas nama {payment.customerName}</Text>

          <YStack width="100%" gap="$4">
            {payment.items.map((item, index) => {
              const optionValueNames = item.options
                .map((option) => option.value)
                .join(', ');

              return (
                <XStack
                  key={`${item.name}-${index}`}
                  justifyContent="space-between"
                  gap="$3"
                >
                  <YStack flex={1} gap="$1">
                    <Text fontWeight="bold">
                      {`${item.amount}x ${item.name}`}
                    </Text>
                    {optionValueNames ? (
                      <Text color="$color10" fontSize="$2">
                        {optionValueNames}
                      </Text>
                    ) : null}
                    {item.note ? (
                      <Text color="$color10" fontSize="$2" fontStyle="italic">
                        Catatan: {item.note}
                      </Text>
                    ) : null}
                  </YStack>
                  <Text fontWeight="bold">{formatRupiah(item.subtotal)}</Text>
                </XStack>
              );
            })}
          </YStack>

          <XStack width="100%" justifyContent="space-between">
            <Text fontWeight="bold">Total</Text>
            <Text fontWeight="bold">{formatRupiah(payment.amount)}</Text>
          </XStack>

          <Button
            theme="blue"
            size="$5"
            minHeight={44}
            onPress={onBackToMenuPress}
          >
            Pesan lagi
          </Button>
        </YStack>
      ))
      .exhaustive()}
  </TableResolveScreen>
);
