import { ReactNode } from 'react';
import { match, P } from 'ts-pattern';
import { Button, Text, YStack } from 'tamagui';
import {
  Payment,
  PaymentCancelReason,
  PaymentMethod,
} from '../../../../domain/entities/Payment';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import { OrderBrandHeader } from '../../components/base/OrderBrandHeader';
import { OrderLayout } from '../../components/base/OrderLayout';
import { CashPaymentView } from '../../components/checkout/CashPaymentView';
import { PaymentCancelAlert } from '../../components/checkout/PaymentCancelAlert';
import { QrisPaymentView } from '../../components/checkout/QrisPaymentView';
import { OrderPreparingView } from '../../components/orderStatus/OrderPreparingView';
import { OrderReadyView } from '../../components/orderStatus/OrderReadyView';

export type OrderStatusCancelConfirmation = {
  isOpen: boolean;
  method: PaymentMethod;
  isCancelling: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export type OrderStatusScreenVariant =
  | { type: 'loading' }
  | {
      type: 'awaitingPayment';
      payment: Payment;
      onCountdownElapsed: () => void;
      canCancel: boolean;
      onCancelPress: () => void;
      cancelConfirmation: OrderStatusCancelConfirmation;
      cancelErrorMessage: string | null;
    }
  | {
      type: 'awaitingCashPayment';
      payment: Payment;
      cashierLocation: string;
      onCountdownElapsed: () => void;
      canCancel: boolean;
      onCancelPress: () => void;
      cancelConfirmation: OrderStatusCancelConfirmation;
      cancelErrorMessage: string | null;
    }
  | {
      type: 'preparing';
      payment: Payment;
      isPolling: boolean;
    }
  | { type: 'ready'; payment: Payment }
  | { type: 'expired'; method: PaymentMethod | null }
  | {
      type: 'cancelled';
      cancelReason: PaymentCancelReason;
      onActionPress: () => void;
    }
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
    <OrderLayout header={<OrderBrandHeader tableLine={tableLine} />}>
      {match(variant)
        .returnType<ReactNode>()
        .with({ type: 'loading' }, () => (
          <LoadingView title="Memuat status pesanan..." />
        ))
        .with(
          { type: 'awaitingPayment' },
          ({
            payment,
            onCountdownElapsed,
            canCancel,
            onCancelPress,
            cancelConfirmation,
            cancelErrorMessage,
          }) => (
            <>
              <QrisPaymentView
                qrContent={payment.qrContent}
                amount={payment.amount}
                expiredAt={payment.expiredAt}
                reference={payment.reference}
                onCountdownElapsed={onCountdownElapsed}
              />
              {canCancel && (
                <CancelPaymentSection
                  onCancelPress={onCancelPress}
                  errorMessage={cancelErrorMessage}
                />
              )}
              <PaymentCancelAlert {...cancelConfirmation} />
            </>
          )
        )
        .with(
          { type: 'awaitingCashPayment' },
          ({
            payment,
            cashierLocation,
            onCountdownElapsed,
            canCancel,
            onCancelPress,
            cancelConfirmation,
            cancelErrorMessage,
          }) => (
            <>
              <CashPaymentView
                cashierLocation={cashierLocation}
                transactionNumber={payment.transactionNumber}
                amount={payment.amount}
                expiredAt={payment.expiredAt}
                onCountdownElapsed={onCountdownElapsed}
              />
              {canCancel && (
                <CancelPaymentSection
                  onCancelPress={onCancelPress}
                  errorMessage={cancelErrorMessage}
                />
              )}
              <PaymentCancelAlert {...cancelConfirmation} />
            </>
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
        .with({ type: 'cancelled' }, ({ cancelReason, onActionPress }) => (
          <EmptyView
            title="Pembayaran dibatalkan"
            subtitle={
              cancelReason === 'superseded'
                ? 'Pesanan ini sudah dibayar lewat pembayaran sebelumnya.'
                : 'Keranjang Anda masih tersimpan.'
            }
            actionLabel={
              cancelReason === 'superseded'
                ? 'Lihat riwayat pesanan'
                : 'Kembali ke keranjang'
            }
            onActionPress={onActionPress}
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

type CancelPaymentSectionProps = {
  onCancelPress: () => void;
  errorMessage: string | null;
};

const CancelPaymentSection = ({
  onCancelPress,
  errorMessage,
}: CancelPaymentSectionProps) => (
  <YStack alignItems="center" gap="$2" paddingTop="$2">
    <Button
      size="$2"
      chromeless
      theme="red"
      color="$red10"
      onPress={onCancelPress}
    >
      Batalkan pembayaran
    </Button>
    {errorMessage ? (
      <Text color="$red10" fontSize="$2" textAlign="center">
        {errorMessage}
      </Text>
    ) : null}
  </YStack>
);
