import { renderHook, act } from '@testing-library/react';
import { useAuthLoginController } from './AuthLoginController';
import { MockAuthRepository } from '../../data/mock';
import { AuthLoginUsecase } from '../../domain';

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createUsecase = () => {
  const authRepo = new MockAuthRepository();
  return {
    usecase: new AuthLoginUsecase(authRepo),
    authRepo,
  };
};

describe('useAuthLoginController', () => {
  beforeEach(() => {
    mockToastShow.mockClear();
  });

  it('should return state, dispatch, and form', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
    expect(result.current.form).toBeDefined();
  });

  it('should start in loaded state', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    expect(result.current.state.type).toBe('loaded');
  });

  it('should initialize form with empty username and password', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    const formValues = result.current.form.getValues();
    expect(formValues.username).toBe('');
    expect(formValues.password).toBe('');
  });

  it('should transition to submitting when SUBMIT dispatched', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    act(() => {
      result.current.dispatch({
        type: 'SUBMIT',
        values: { username: 'admin', password: 'secret' },
      });
    });

    expect(result.current.state.type).toBe('submitting');
  });

  it('should transition to submitSuccess after successful login', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    act(() => {
      result.current.dispatch({
        type: 'SUBMIT',
        values: { username: 'admin', password: 'secret' },
      });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('submitSuccess');
  });

  it('should show success toast after login succeeds', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    act(() => {
      result.current.dispatch({
        type: 'SUBMIT',
        values: { username: 'admin', password: 'secret' },
      });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Login Success');
  });

  it('should show error toast and recover after login fails', async () => {
    const { usecase, authRepo } = createUsecase();
    authRepo.setShouldFail(true);

    const { result } = renderHook(() => useAuthLoginController(usecase));

    act(() => {
      result.current.dispatch({
        type: 'SUBMIT',
        values: { username: 'admin', password: 'wrong' },
      });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Login Error');
  });

  it('should recover to loaded state after submitError (via SUBMIT_CANCEL)', async () => {
    const { usecase, authRepo } = createUsecase();
    authRepo.setShouldFail(true);

    const { result } = renderHook(() => useAuthLoginController(usecase));

    act(() => {
      result.current.dispatch({
        type: 'SUBMIT',
        values: { username: 'admin', password: 'wrong' },
      });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The usecase auto-dispatches SUBMIT_CANCEL from submitError state
    expect(result.current.state.type).toBe('loaded');
  });

  it('should preserve submitted values in state while submitting', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useAuthLoginController(usecase));

    const credentials = { username: 'testuser', password: 'testpass' };
    act(() => {
      result.current.dispatch({ type: 'SUBMIT', values: credentials });
    });

    expect(result.current.state.type).toBe('submitting');
    if (result.current.state.type === 'submitting') {
      expect(result.current.state.values).toEqual(credentials);
    }
  });
});
