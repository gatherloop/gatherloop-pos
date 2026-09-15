import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Payment } from '../../../../domain/entities/Payment';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import { QrisPaymentView } from '../../components/checkout/QrisPaymentView';
import { OrderLeaveConfirmAlert } from '../../components/orderStatus/OrderLeaveConfirmAlert';
import { OrderPreparingView } from '../../components/orderStatus/OrderPreparingView';
import { OrderReadyView } from '../../components/orderStatus/OrderReadyView';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type OrderStatusScreenVariant =
  | { type: 'loading' }
  | {
      type: 'awaitingPayment';
      payment: Payment;
      onCountdownElapsed: () => void;
    }
  | { type: 'preparing'; payment: Payment; isPolling: boolean }
  | { type: 'ready'; payment: Payment }
  | { type: 'expired' }
  | { type: 'notFound' }
  | { type: 'error'; onRetryPress: () => void };

export type OrderStatusScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  variant: OrderStatusScreenVariant;
  onBackToMenuPress: () => void;
  onBackToCartPress: () => void;
  isLeaveConfirmOpen: boolean;
  leaveConfirmTransactionNumber: number;
  onLeaveConfirm: () => void;
  onLeaveCancel: () => void;
};

export const OrderStatusScreen = ({
  tableVariant,
  variant,
  onBackToMenuPress,
  onBackToCartPress,
  isLeaveConfirmOpen,
  leaveConfirmTransactionNumber,
  onLeaveConfirm,
  onLeaveCancel,
}: OrderStatusScreenProps) => (
  <TableResolveScreen variant={tableVariant}>
    <OrderLeaveConfirmAlert
      isOpen={isLeaveConfirmOpen}
      transactionNumber={leaveConfirmTransactionNumber}
      onCancel={onLeaveCancel}
      onConfirm={onLeaveConfirm}
    />
    {match(variant)
      .returnType<ReactNode>()
      .with({ type: 'loading' }, () => (
        <LoadingView title="Memuat status pesanan..." />
      ))
      .with({ type: 'awaitingPayment' }, ({ payment, onCountdownElapsed }) => (
        <QrisPaymentView
          qrContent={payment.qrContent}
          amount={payment.amount}
          expiredAt={payment.expiredAt}
          reference={payment.reference}
          onCountdownElapsed={onCountdownElapsed}
        />
      ))
      .with({ type: 'expired' }, () => (
        <EmptyView
          title="Waktu pembayaran habis"
          subtitle="Keranjang Anda masih tersimpan."
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
          tableLabel={payment.tableLabel}
          items={payment.items}
          amount={payment.amount}
          isPolling={isPolling}
          onBackToMenuPress={onBackToMenuPress}
        />
      ))
      .with({ type: 'ready' }, ({ payment }) => (
        <OrderReadyView transactionNumber={payment.transactionNumber} />
      ))
      .exhaustive()}
  </TableResolveScreen>
);
