import { ReactNode } from 'react';
import { ScrollView, Text, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { PaymentSummary } from '../../../../domain/entities/Payment';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { OrderBrandHeader } from '../../components/base/OrderBrandHeader';
import { OrderLayout } from '../../components/base/OrderLayout';
import { SkeletonList } from '../../components/base/SkeletonView';
import { Focusable } from '../../components/base/Focusable';
import { OrderHistoryListItem } from '../../components/orderHistory/OrderHistoryListItem';

export type OrderHistoryScreenVariant =
  | { type: 'loading' }
  | { type: 'empty' }
  | { type: 'error'; onRetryPress: () => void }
  | { type: 'loaded'; payments: PaymentSummary[] };

export type OrderHistoryScreenProps = {
  variant: OrderHistoryScreenVariant;
  onItemPress: (payment: PaymentSummary) => void;
  onEmptyActionPress: () => void;
};

export const OrderHistoryScreen = ({
  variant,
  onItemPress,
  onEmptyActionPress,
}: OrderHistoryScreenProps) => {
  return (
    <OrderLayout header={<OrderBrandHeader />}>
      <YStack flex={1} gap="$3">
        <Text fontWeight="bold" alignSelf="center" fontSize="$6">
          Pesanan Saya
        </Text>

        {match(variant)
          .returnType<ReactNode>()
          .with({ type: 'loading' }, () => <SkeletonList />)
          .with({ type: 'empty' }, () => (
            <EmptyView
              title="Belum ada pesanan"
              subtitle="Pesanan yang Anda buat akan muncul di sini."
              actionLabel="Kembali ke menu"
              onActionPress={onEmptyActionPress}
            />
          ))
          .with({ type: 'error' }, ({ onRetryPress }) => (
            <ErrorView
              title="Gagal memuat pesanan"
              subtitle="Terjadi kesalahan. Silakan coba lagi."
              onRetryButtonPress={onRetryPress}
            />
          ))
          .with({ type: 'loaded' }, ({ payments }) => (
            <ScrollView flex={1}>
              <YStack gap="$3" flex={1}>
                {payments.map((payment) => (
                  <Focusable
                    key={payment.reference}
                    onEnterPress={() => onItemPress(payment)}
                  >
                    <OrderHistoryListItem
                      transactionNumber={payment.transactionNumber}
                      status={payment.status}
                      method={payment.method}
                      fulfillmentStatus={payment.fulfillmentStatus}
                      diningOption={payment.diningOption}
                      createdAt={payment.createdAt}
                      tableLabel={payment.tableLabel}
                      customerName={payment.customerName}
                      itemCount={payment.itemCount}
                      amount={payment.amount}
                      onPress={() => onItemPress(payment)}
                    />
                  </Focusable>
                ))}
              </YStack>
            </ScrollView>
          ))
          .exhaustive()}
      </YStack>
    </OrderLayout>
  );
};
