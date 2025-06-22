import { match } from 'ts-pattern';
import { AuthLoginForm } from '../entities';
import { AuthRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: AuthLoginForm;
};

export type AuthLoginState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type AuthLoginAction =
  | { type: 'SUBMIT'; values: AuthLoginForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class AuthLoginUsecase extends Usecase<AuthLoginState, AuthLoginAction> {
  params: undefined;
  repository: AuthRepository;

  constructor(repository: AuthRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): AuthLoginState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: {
        username: '',
        password: '',
      },
    };
  }

  getNextState(state: AuthLoginState, action: AuthLoginAction): AuthLoginState {
    return match([state, action])
      .returnType<AuthLoginState>()
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'submitSuccess',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'submitError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: AuthLoginState,
    dispatch: (action: AuthLoginAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .login(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Login failed' })
          );
      })
      .with({ type: 'submitError' }, () => {
        dispatch({ type: 'SUBMIT_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
