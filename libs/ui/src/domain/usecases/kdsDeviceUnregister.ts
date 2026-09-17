import { match } from 'ts-pattern';
import { KdsDeviceRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
};

export type KdsDeviceUnregisterState = (
  | { type: 'idle' }
  | { type: 'unregistering' }
  | { type: 'unregistered' }
  | { type: 'error' }
) &
  Context;

export type KdsDeviceUnregisterAction =
  | { type: 'UNREGISTER' }
  | { type: 'UNREGISTER_SUCCESS' }
  | { type: 'UNREGISTER_ERROR'; errorMessage: string };

export type KdsDeviceUnregisterParams = {
  kdsDeviceId: number;
};

export class KdsDeviceUnregisterUsecase extends Usecase<
  KdsDeviceUnregisterState,
  KdsDeviceUnregisterAction,
  KdsDeviceUnregisterParams
> {
  params: KdsDeviceUnregisterParams;
  private repository: KdsDeviceRepository;

  constructor(
    repository: KdsDeviceRepository,
    params: KdsDeviceUnregisterParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): KdsDeviceUnregisterState {
    return { type: 'idle', errorMessage: null };
  }

  getNextState(
    state: KdsDeviceUnregisterState,
    action: KdsDeviceUnregisterAction
  ): KdsDeviceUnregisterState {
    return match([state, action])
      .returnType<KdsDeviceUnregisterState>()
      .with([{ type: 'idle' }, { type: 'UNREGISTER' }], ([state]) => ({
        ...state,
        type: 'unregistering',
        errorMessage: null,
      }))
      .with(
        [{ type: 'unregistering' }, { type: 'UNREGISTER_SUCCESS' }],
        ([state]) => ({ ...state, type: 'unregistered' })
      )
      .with(
        [{ type: 'unregistering' }, { type: 'UNREGISTER_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: KdsDeviceUnregisterState,
    dispatch: (action: KdsDeviceUnregisterAction) => void
  ): void {
    match(state)
      .with({ type: 'unregistering' }, () => {
        this.repository
          .deleteKdsDeviceById(this.params.kdsDeviceId)
          .then(() => dispatch({ type: 'UNREGISTER_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'UNREGISTER_ERROR',
              errorMessage: 'Failed to unregister device',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
