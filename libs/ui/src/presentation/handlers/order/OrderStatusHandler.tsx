import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { PaymentRepository } from '../../../domain/repositories/payment';
import { SessionRepository } from '../../../domain/repositories/session';
import { OrderStatusUsecase } from '../../../domain/usecases/orderStatus';
import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import { useBackNavigationGuard } from '../hooks/useBackNavigationGuard';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { usePaymentCancel } from '../hooks/usePaymentCancel';
import {
  OrderStatusCancelConfirmation,
  OrderStatusScreen,
  OrderStatusScreenVariant,
} from '../../views/screens/order/OrderStatusScreen';

export type OrderStatusHandlerProps = {
  orderStatusUsecase: OrderStatusUsecase;
  paymentRepository: PaymentRepository;
  sessionRepository: SessionRepository;
  cashierLocation: string;
};

export const OrderStatusHandler = ({
  orderStatusUsecase,
  paymentRepository,
  sessionRepository,
  cashierLocation,
}: OrderStatusHandlerProps) => {
  const orderStatus = useOrderStatus(orderStatusUsecase);
  const router = useRouter();

  const tableCode = sessionRepository.getTableCode();
  const menuPath = tableCode ? `/t/${tableCode}` : '/';
  const cartPath = tableCode ? `/t/${tableCode}/cart` : '/';

  const payment = orderStatus.state.payment;

  const [paymentCancelUsecase, setPaymentCancelUsecase] = useState(
    () =>
      new PaymentCancelUsecase(paymentRepository, {
        reference: orderStatusUsecase.params.reference,
        method: payment?.method ?? 'qris',
      })
  );

  if (payment && payment.method !== paymentCancelUsecase.params.method) {
    setPaymentCancelUsecase(
      new PaymentCancelUsecase(paymentRepository, {
        reference: orderStatusUsecase.params.reference,
        method: payment.method,
      })
    );
  }

  const paymentCancel = usePaymentCancel(paymentCancelUsecase);

  useEffect(() => {
    if (paymentCancel.state.type !== 'settled' || !paymentCancel.state.result) {
      return;
    }

    if (paymentCancel.state.result.status === 'cancelled') {
      router.replace(cartPath);
    } else {
      orderStatus.dispatch({ type: 'FETCH' });
    }
  }, [paymentCancel.state, router, cartPath, orderStatus.dispatch]);

  const isAwaitingPayment =
    orderStatus.state.type === 'awaitingPayment' ||
    orderStatus.state.type === 'awaitingCashPayment';

  useEffect(() => {
    if (!isAwaitingPayment && paymentCancel.state.type === 'confirming') {
      paymentCancel.dispatch({ type: 'DISMISS' });
    }
  }, [isAwaitingPayment, paymentCancel.state.type, paymentCancel.dispatch]);

  useBackNavigationGuard(
    isAwaitingPayment && (payment?.canCancel ?? false),
    () => paymentCancel.dispatch({ type: 'REQUEST' })
  );

  const cancelConfirmation: OrderStatusCancelConfirmation = {
    isOpen:
      paymentCancel.state.type === 'confirming' ||
      paymentCancel.state.type === 'cancelling',
    method: paymentCancel.state.method,
    isCancelling: paymentCancel.state.type === 'cancelling',
    onConfirm: () => paymentCancel.dispatch({ type: 'CONFIRM' }),
    onDismiss: () => paymentCancel.dispatch({ type: 'DISMISS' }),
  };

  const cancelErrorMessage =
    paymentCancel.state.type === 'error'
      ? paymentCancel.state.errorMessage
      : null;

  const variant: OrderStatusScreenVariant = match(orderStatus.state)
    .returnType<OrderStatusScreenVariant>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: 'notFound' }, () => ({ type: 'notFound' }))
    .with({ type: 'expired' }, (state) => ({
      type: 'expired',
      method: state.payment?.method ?? null,
    }))
    .with({ type: 'error' }, () => ({
      type: 'error',
      onRetryPress: () => orderStatus.dispatch({ type: 'FETCH' }),
    }))
    .with({ type: 'awaitingPayment' }, (state) =>
      state.payment
        ? {
            type: 'awaitingPayment',
            payment: state.payment,
            onCountdownElapsed: () =>
              orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' }),
            canCancel: state.payment.canCancel,
            onCancelPress: () => paymentCancel.dispatch({ type: 'REQUEST' }),
            cancelConfirmation,
            cancelErrorMessage,
          }
        : { type: 'loading' }
    )
    .with({ type: 'awaitingCashPayment' }, (state) =>
      state.payment
        ? {
            type: 'awaitingCashPayment',
            payment: state.payment,
            cashierLocation,
            onCountdownElapsed: () =>
              orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' }),
            canCancel: state.payment.canCancel,
            onCancelPress: () => paymentCancel.dispatch({ type: 'REQUEST' }),
            cancelConfirmation,
            cancelErrorMessage,
          }
        : { type: 'loading' }
    )
    .with({ type: 'preparing' }, (state) =>
      state.payment
        ? {
            type: 'preparing',
            payment: state.payment,
            isPolling: state.isPolling,
          }
        : { type: 'notFound' }
    )
    .with({ type: 'ready' }, (state) =>
      state.payment
        ? { type: 'ready', payment: state.payment }
        : { type: 'notFound' }
    )
    .with({ type: 'cancelled' }, (state) => {
      const cancelReason = state.payment?.cancelReason ?? 'guest';
      return {
        type: 'cancelled',
        cancelReason,
        onActionPress: () =>
          router.push(cancelReason === 'superseded' ? '/orders' : cartPath),
      };
    })
    .exhaustive();

  return (
    <OrderStatusScreen
      variant={variant}
      onBackToMenuPress={() => router.push(menuPath)}
      onBackToCartPress={() => router.push(cartPath)}
      onHistoryPress={() => router.push('/orders')}
    />
  );
};
