import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { CartUsecase } from '../../../domain/usecases/cart';
import { CheckoutUsecase } from '../../../domain/usecases/checkout';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCheckout';
import { useTableResolve } from '../hooks/useTableResolve';
import {
  CheckoutScreen,
  CheckoutScreenVariant,
} from '../../views/screens/order/CheckoutScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type CheckoutHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  cartUsecase: CartUsecase;
  checkoutUsecase: CheckoutUsecase;
  sessionRepository: SessionRepository;
  enabled: boolean;
  tableCode: string;
};

const PAID_REDIRECT_DELAY_MS = 2000;

export const CheckoutHandler = ({
  tableResolveUsecase,
  cartUsecase,
  checkoutUsecase,
  sessionRepository,
  enabled,
  tableCode,
}: CheckoutHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const cart = useCart(cartUsecase);
  const checkout = useCheckout(checkoutUsecase);
  const router = useRouter();

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  useEffect(() => {
    if (checkout.state.type !== 'paid' || !checkout.state.payment) return;

    const reference = checkout.state.payment.reference;
    const timeoutId = setTimeout(() => {
      router.push(`/t/${tableCode}/status?ref=${reference}`);
    }, PAID_REDIRECT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [checkout.state, router, tableCode]);

  const variant: CheckoutScreenVariant = !enabled
    ? { type: 'disabled' }
    : match(checkout.state)
        .returnType<CheckoutScreenVariant>()
        .with({ type: 'awaitingPayment' }, (state) =>
          state.payment
            ? {
                type: 'awaitingPayment',
                payment: state.payment,
                onCountdownElapsed: () =>
                  checkout.dispatch({ type: 'COUNTDOWN_ELAPSED' }),
              }
            : { type: 'loadingCart' }
        )
        .with({ type: 'paid' }, (state) =>
          state.payment
            ? { type: 'paid', payment: state.payment }
            : { type: 'loadingCart' }
        )
        .with({ type: 'expired' }, () => ({
          type: 'expired',
          onRetryPress: () => checkout.dispatch({ type: 'SUBMIT_NAME' }),
        }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryPress: () => checkout.dispatch({ type: 'SUBMIT_NAME' }),
        }))
        .with(
          { type: P.union('idle', 'askingName', 'creatingPayment') },
          (checkoutState) =>
            match(cart.state)
              .returnType<CheckoutScreenVariant>()
              .with({ type: P.union('idle', 'loading') }, () => ({
                type: 'loadingCart',
              }))
              .with({ type: 'error' }, () => ({
                type: 'cartError',
                onRetryPress: () => cart.dispatch({ type: 'FETCH' }),
              }))
              .with(
                {
                  type: P.union(
                    'loaded',
                    'adding',
                    'updating',
                    'removing',
                    'clearing'
                  ),
                },
                (cartState) => {
                  if (!cartState.cart || cartState.cart.items.length === 0) {
                    return { type: 'emptyCart' };
                  }
                  const loadedCart = cartState.cart;

                  return match(checkoutState)
                    .returnType<CheckoutScreenVariant>()
                    .with({ type: 'idle' }, () => ({
                      type: 'summary',
                      cart: loadedCart,
                      onPayPress: () =>
                        checkout.dispatch({ type: 'ASK_NAME' }),
                    }))
                    .with({ type: 'askingName' }, (state) => ({
                      type: 'askingName',
                      cart: loadedCart,
                      name: state.customerName,
                      nameErrorMessage: state.nameErrorMessage,
                      onNameChange: (name) =>
                        checkout.dispatch({ type: 'CHANGE_NAME', name }),
                      onSubmitPress: () =>
                        checkout.dispatch({ type: 'SUBMIT_NAME' }),
                      onCancelPress: () =>
                        checkout.dispatch({ type: 'CANCEL_NAME' }),
                    }))
                    .with({ type: 'creatingPayment' }, () => ({
                      type: 'creatingPayment',
                      cart: loadedCart,
                    }))
                    .exhaustive();
                }
              )
              .exhaustive()
        )
        .exhaustive();

  return (
    <CheckoutScreen
      tableVariant={match(tableResolve.state)
        .returnType<TableResolveScreenProps['variant']>()
        .with({ type: P.union('idle', 'resolving') }, () => ({
          type: 'resolving',
        }))
        .with({ type: 'noCode' }, () => ({ type: 'noQr' }))
        .with({ type: 'notFound' }, () => ({ type: 'invalidQr' }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => tableResolve.dispatch({ type: 'FETCH' }),
        }))
        .with({ type: 'resolved' }, ({ table }) =>
          table
            ? { type: 'resolved', table }
            : {
                type: 'error',
                onRetryButtonPress: () =>
                  tableResolve.dispatch({ type: 'FETCH' }),
              }
        )
        .exhaustive()}
      variant={variant}
      onBackToCartPress={() => router.push(`/t/${tableCode}/cart`)}
    />
  );
};
