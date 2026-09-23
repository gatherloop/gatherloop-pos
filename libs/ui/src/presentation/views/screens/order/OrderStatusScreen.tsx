import { ReactNode } from 'react';
import { match, P } from 'ts-pattern';
import { Payment, PaymentMethod } from '../../../../domain/entities/Payment';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import { OrderBrandHeader } from '../../components/base/OrderBrandHeader';
import { OrderLayout } from '../../components/base/OrderLayout';
import { CashPaymentView } from '../../components/checkout/CashPaymentView';
import { QrisPaymentView } from '../../components/checkout/QrisPaymentView';
import { OrderPreparingView } from '../../components/orderStatus/OrderPreparingView';
import { OrderReadyView } from '../../components/orderStatus/OrderReadyView';

export type OrderStatusScreenVariant =
  | { type: 'loading' }
  | {
      type: 'awaitingPayment';
      payment: Payment;
      onCountdownElapsed: () => void;
    }
  | {
      type: 'awaitingCashPayment';
      payment: Payment;
      cashierLocation: string;
      onCountdownElapsed: () => void;
    }
  | {
      type: 'preparing';
      payment: Payment;
      isPolling: boolean;
    }
  | { type: 'ready'; payment: Payment }
  | { type: 'expired'; method: PaymentMethod | null }
  | { type: 'notFound' }
  | { type: 'error'; onRetryPress: () => void };

export type OrderStatusScreenProps = {
  variant: OrderStatusScreenVariant;
  onBackToMenuPress: () => void;
  onBackToCartPress: () => void;
  onHistoryPress?: () => void;
};

export const OrderStatusScreen = ({
  variant,
  onBackToMenuPress,
  onBackToCartPress,
  onHistoryPress,
}: OrderStatusScreenProps) => {
  const tableLine = match(variant)
    .returnType<string | undefined>()
    .with(
      {
        type: P.union(
          'awaitingPayment',
          'awaitingCashPayment',
          'preparing',
          'ready'
        ),
      },
      ({ payment }) => payment.tableLabel
    )
    .otherwise(() => undefined);

  return (
    <OrderLayout
      header={
        <OrderBrandHeader
          tableLine={tableLine}
          onHistoryPress={onHistoryPress}
        />
      }
    >
      {match(variant)
        .returnType<ReactNode>()
        .with({ type: 'loading' }, () => (
          <LoadingView title="Memuat status pesanan..." />
        ))
        .with(
          { type: 'awaitingPayment' },
          ({ payment, onCountdownElapsed }) => (
            <QrisPaymentView
              qrContent={payment.qrContent}
              amount={payment.amount}
              expiredAt={payment.expiredAt}
              reference={payment.reference}
              onCountdownElapsed={onCountdownElapsed}
            />
          )
        )
        .with(
          { type: 'awaitingCashPayment' },
          ({ payment, cashierLocation, onCountdownElapsed }) => (
            <CashPaymentView
              cashierLocation={cashierLocation}
              transactionNumber={payment.transactionNumber}
              reference={payment.reference}
              amount={payment.amount}
              expiredAt={payment.expiredAt}
              items={payment.items}
              onCountdownElapsed={onCountdownElapsed}
            />
          )
        )
        .with({ type: 'expired' }, ({ method }) => (
          <EmptyView
            title="Waktu pembayaran habis"
            subtitle={
              method === 'cash'
                ? 'Pesanan dibatalkan karena belum dibayar. Keranjang Anda masih tersimpan.'
                : 'Keranjang Anda masih tersimpan.'
            }
            actionLabel="Kembali ke keranjang"
            onActionPress={onBackToCartPress}
          />
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
        .with({ type: 'preparing' }, ({ payment, isPolling }) => (
          <OrderPreparingView
            transactionNumber={payment.transactionNumber}
            items={payment.items}
            amount={payment.amount}
            isPolling={isPolling}
          />
        ))
        .with({ type: 'ready' }, ({ payment }) => (
          <OrderReadyView
            transactionNumber={payment.transactionNumber}
            items={payment.items}
            amount={payment.amount}
          />
        ))
        .exhaustive()}
    </OrderLayout>
  );
};
