import { match } from 'ts-pattern';
import { KdsDeviceRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
};

export type KdsTestNotificationState = (
  | { type: 'idle' }
  | { type: 'sending' }
  | { type: 'sent' }
  | { type: 'error' }
) &
  Context;

export type KdsTestNotificationAction =
  | { type: 'SEND' }
  | { type: 'SEND_SUCCESS' }
  | { type: 'SEND_ERROR'; errorMessage: string }
  | { type: 'RESET' };

export type KdsTestNotificationParams = {
  kdsDeviceId: number;
};

export class KdsTestNotificationUsecase extends Usecase<
  KdsTestNotificationState,
  KdsTestNotificationAction,
  KdsTestNotificationParams
> {
  params: KdsTestNotificationParams;
  private repository: KdsDeviceRepository;

  constructor(
    repository: KdsDeviceRepository,
    params: KdsTestNotificationParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): KdsTestNotificationState {
    return { type: 'idle', errorMessage: null };
  }

  getNextState(
    state: KdsTestNotificationState,
    action: KdsTestNotificationAction
  ): KdsTestNotificationState {
    return match([state, action])
      .returnType<KdsTestNotificationState>()
      .with([{ type: 'idle' }, { type: 'SEND' }], ([state]) => ({
        ...state,
        type: 'sending',
        errorMessage: null,
      }))
      .with([{ type: 'error' }, { type: 'SEND' }], ([state]) => ({
        ...state,
        type: 'sending',
        errorMessage: null,
      }))
      .with([{ type: 'sending' }, { type: 'SEND_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'sent',
      }))
      .with(
        [{ type: 'sending' }, { type: 'SEND_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with([{ type: 'sent' }, { type: 'RESET' }], ([state]) => ({
        ...state,
        type: 'idle',
      }))
      .otherwise(() => state);
  }

  onStateChange(
    state: KdsTestNotificationState,
    dispatch: (action: KdsTestNotificationAction) => void
  ): void {
    match(state)
      .with({ type: 'sending' }, () => {
        this.repository
          .sendTestNotification(this.params.kdsDeviceId)
          .then(() => dispatch({ type: 'SEND_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'SEND_ERROR',
              errorMessage: 'Failed to send test notification',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
