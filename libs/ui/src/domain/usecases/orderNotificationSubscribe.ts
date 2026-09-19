import { match, P } from 'ts-pattern';
import { WebPushRepository, WebPushSubscriptionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
};

export type OrderNotificationSubscribeState = (
  | { type: 'unsupported' }
  | { type: 'needsInstall' }
  | { type: 'checkingSubscription' }
  | { type: 'idle' }
  | { type: 'checkingPermission' }
  | { type: 'permissionDenied' }
  | { type: 'subscribing' }
  | { type: 'subscribed' }
  | { type: 'subscribeError' }
  | { type: 'unsubscribing' }
) &
  Context;

export type OrderNotificationSubscribeAction =
  | { type: 'SUBSCRIBE' }
  | { type: 'EXISTING_SUBSCRIPTION_FOUND' }
  | { type: 'EXISTING_SUBSCRIPTION_NOT_FOUND' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'SUBSCRIBE_SUCCESS' }
  | { type: 'SUBSCRIBE_ERROR'; errorMessage: string }
  | { type: 'RETRY' }
  | { type: 'UNSUBSCRIBE' }
  | { type: 'UNSUBSCRIBE_SUCCESS' }
  | { type: 'UNSUBSCRIBE_ERROR'; errorMessage: string };

export class OrderNotificationSubscribeUsecase extends Usecase<
  OrderNotificationSubscribeState,
  OrderNotificationSubscribeAction
> {
  params: undefined;

  constructor(
    private webPushRepository: WebPushRepository,
    private webPushSubscriptionRepository: WebPushSubscriptionRepository
  ) {
    super();
  }

  getInitialState(): OrderNotificationSubscribeState {
    const context: Context = { errorMessage: null };
    const supportStatus = this.webPushRepository.getSupportStatus();

    if (supportStatus === 'unsupported') {
      return { ...context, type: 'unsupported' };
    }
    if (supportStatus === 'needsInstall') {
      return { ...context, type: 'needsInstall' };
    }
    return { ...context, type: 'checkingSubscription' };
  }

  getNextState(
    state: OrderNotificationSubscribeState,
    action: OrderNotificationSubscribeAction
  ): OrderNotificationSubscribeState {
    return match([state, action])
      .returnType<OrderNotificationSubscribeState>()
      .with(
        [
          { type: 'checkingSubscription' },
          { type: 'EXISTING_SUBSCRIPTION_FOUND' },
        ],
        ([state]) => ({ ...state, type: 'subscribed' })
      )
      .with(
        [
          { type: 'checkingSubscription' },
          { type: 'EXISTING_SUBSCRIPTION_NOT_FOUND' },
        ],
        ([state]) => ({ ...state, type: 'idle' })
      )
      .with(
        [
          { type: P.union('idle', 'permissionDenied') },
          { type: 'SUBSCRIBE' },
        ],
        ([state]) => ({
          ...state,
          type: 'checkingPermission',
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'checkingPermission' }, { type: 'PERMISSION_GRANTED' }],
        ([state]) => ({ ...state, type: 'subscribing' })
      )
      .with(
        [{ type: 'checkingPermission' }, { type: 'PERMISSION_DENIED' }],
        ([state]) => ({ ...state, type: 'permissionDenied' })
      )
      .with(
        [{ type: 'subscribing' }, { type: 'SUBSCRIBE_SUCCESS' }],
        ([state]) => ({ ...state, type: 'subscribed', errorMessage: null })
      )
      .with(
        [{ type: 'subscribing' }, { type: 'SUBSCRIBE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'subscribeError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'subscribeError' }, { type: 'RETRY' }],
        ([state]) => ({ ...state, type: 'subscribing', errorMessage: null })
      )
      .with(
        [{ type: 'subscribed' }, { type: 'UNSUBSCRIBE' }],
        ([state]) => ({ ...state, type: 'unsubscribing', errorMessage: null })
      )
      .with(
        [{ type: 'unsubscribing' }, { type: 'UNSUBSCRIBE_SUCCESS' }],
        ([state]) => ({ ...state, type: 'idle', errorMessage: null })
      )
      .with(
        [{ type: 'unsubscribing' }, { type: 'UNSUBSCRIBE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'subscribed',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: OrderNotificationSubscribeState,
    dispatch: (action: OrderNotificationSubscribeAction) => void
  ): void {
    match(state)
      .with({ type: 'checkingSubscription' }, () => {
        this.webPushRepository
          .getSubscription()
          .then((subscription) =>
            dispatch(
              subscription
                ? { type: 'EXISTING_SUBSCRIPTION_FOUND' }
                : { type: 'EXISTING_SUBSCRIPTION_NOT_FOUND' }
            )
          )
          .catch(() => dispatch({ type: 'EXISTING_SUBSCRIPTION_NOT_FOUND' }));
      })
      .with({ type: 'checkingPermission' }, () => {
        this.webPushRepository
          .requestPermission()
          .then((status) =>
            dispatch(
              status === 'granted'
                ? { type: 'PERMISSION_GRANTED' }
                : { type: 'PERMISSION_DENIED' }
            )
          )
          .catch(() => dispatch({ type: 'PERMISSION_DENIED' }));
      })
      .with({ type: 'subscribing' }, () => {
        this.webPushSubscriptionRepository
          .fetchConfig()
          .then((config) =>
            this.webPushRepository.subscribe(config.vapidPublicKey)
          )
          .then((subscription) =>
            this.webPushSubscriptionRepository.subscribe(subscription)
          )
          .then(() => dispatch({ type: 'SUBSCRIBE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'SUBSCRIBE_ERROR',
              errorMessage: 'Failed to enable notifications',
            })
          );
      })
      .with({ type: 'unsubscribing' }, () => {
        this.webPushRepository
          .getSubscription()
          .then((subscription) =>
            subscription
              ? this.webPushSubscriptionRepository
                  .unsubscribe(subscription.endpoint)
                  .then(() => this.webPushRepository.unsubscribe())
              : undefined
          )
          .then(() => dispatch({ type: 'UNSUBSCRIBE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'UNSUBSCRIBE_ERROR',
              errorMessage: 'Failed to turn off notifications',
            })
          );
      })
      .otherwise(() => {
        // no side effects for the remaining states
      });
  }
}
