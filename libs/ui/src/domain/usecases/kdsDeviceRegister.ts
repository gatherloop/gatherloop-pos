import { match, P } from 'ts-pattern';
import { KdsDevice, KdsPlatform } from '../entities';
import { KdsDeviceRepository, PushTokenRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  name: string;
  device: KdsDevice | null;
  errorMessage: string | null;
};

export type KdsDeviceRegisterState = (
  | { type: 'idle' }
  | { type: 'checkingPermission' }
  | { type: 'permissionDenied' }
  | { type: 'permissionGranted' }
  | { type: 'registering' }
  | { type: 'registered' }
  | { type: 'registerError' }
) &
  Context;

export type KdsDeviceRegisterAction =
  | { type: 'REQUEST_PERMISSION'; name: string }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'REGISTER' }
  | { type: 'REGISTER_SUCCESS'; device: KdsDevice }
  | { type: 'REGISTER_ERROR'; errorMessage: string }
  | { type: 'RETRY' };

export class KdsDeviceRegisterUsecase extends Usecase<
  KdsDeviceRegisterState,
  KdsDeviceRegisterAction
> {
  params: undefined;
  private kdsDeviceRepository: KdsDeviceRepository;
  private pushTokenRepository: PushTokenRepository;
  private platform: KdsPlatform;

  constructor(
    kdsDeviceRepository: KdsDeviceRepository,
    pushTokenRepository: PushTokenRepository,
    platform: KdsPlatform
  ) {
    super();
    this.kdsDeviceRepository = kdsDeviceRepository;
    this.pushTokenRepository = pushTokenRepository;
    this.platform = platform;
  }

  getInitialState(): KdsDeviceRegisterState {
    return {
      type: 'idle',
      name: '',
      device: null,
      errorMessage: null,
    };
  }

  getNextState(
    state: KdsDeviceRegisterState,
    action: KdsDeviceRegisterAction
  ): KdsDeviceRegisterState {
    return match([state, action])
      .returnType<KdsDeviceRegisterState>()
      .with(
        [
          { type: P.union('idle', 'permissionDenied') },
          { type: 'REQUEST_PERMISSION' },
        ],
        ([state, { name }]) => ({
          ...state,
          type: 'checkingPermission',
          name,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'checkingPermission' }, { type: 'PERMISSION_GRANTED' }],
        ([state]) => ({ ...state, type: 'permissionGranted' })
      )
      .with(
        [{ type: 'checkingPermission' }, { type: 'PERMISSION_DENIED' }],
        ([state]) => ({ ...state, type: 'permissionDenied' })
      )
      .with(
        [{ type: 'permissionGranted' }, { type: 'REGISTER' }],
        ([state]) => ({ ...state, type: 'registering' })
      )
      .with(
        [{ type: 'registerError' }, { type: 'RETRY' }],
        ([state]) => ({ ...state, type: 'registering' })
      )
      .with(
        [{ type: 'registering' }, { type: 'REGISTER_SUCCESS' }],
        ([state, { device }]) => ({
          ...state,
          type: 'registered',
          device,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'registering' }, { type: 'REGISTER_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'registerError',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: KdsDeviceRegisterState,
    dispatch: (action: KdsDeviceRegisterAction) => void
  ): void {
    match(state)
      .with({ type: 'checkingPermission' }, () => {
        this.pushTokenRepository
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
      .with({ type: 'permissionGranted' }, () => {
        dispatch({ type: 'REGISTER' });
      })
      .with({ type: 'registering' }, ({ name }) => {
        this.pushTokenRepository
          .getPushToken()
          .then((pushToken) =>
            this.kdsDeviceRepository.registerKdsDevice({
              name,
              pushToken,
              platform: this.platform,
            })
          )
          .then((device) => dispatch({ type: 'REGISTER_SUCCESS', device }))
          .catch(() =>
            dispatch({
              type: 'REGISTER_ERROR',
              errorMessage: 'Failed to register device',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
