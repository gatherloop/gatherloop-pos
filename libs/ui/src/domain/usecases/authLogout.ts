import { match, P } from 'ts-pattern';
import { AuthRepository } from '../repositories';
import { Usecase } from './IUsecase';

export type AuthLogoutState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' };

export type AuthLogoutAction =
  | { type: 'LOGOUT' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_ERROR' };

export class AuthLogoutUsecase extends Usecase<
  AuthLogoutState,
  AuthLogoutAction
> {
  params: undefined;
  repository: AuthRepository;

  constructor(repository: AuthRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const state: AuthLogoutState = {
      type: 'idle',
    };
    return state;
  }

  getNextState(state: AuthLogoutState, action: AuthLogoutAction) {
    return match([state, action])
      .returnType<AuthLogoutState>()
      .with([{ type: P.union('idle') }, { type: 'LOGOUT' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with([{ type: 'loading' }, { type: 'LOGOUT_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'loaded',
      }))
      .with([{ type: 'loading' }, { type: 'LOGOUT_ERROR' }], ([state]) => ({
        ...state,
        type: 'idle',
      }))
      .otherwise(() => state);
  }

  onStateChange(
    state: AuthLogoutState,
    dispatch: (action: AuthLogoutAction) => void
  ) {
    match(state)
      .with({ type: 'loading' }, () =>
        this.repository
          .logout()
          .then(() => dispatch({ type: 'LOGOUT_SUCCESS' }))
          .catch(() => dispatch({ type: 'LOGOUT_ERROR' }))
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
