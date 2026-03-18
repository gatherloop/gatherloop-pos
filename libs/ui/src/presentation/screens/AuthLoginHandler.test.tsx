import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthLoginHandler } from './AuthLoginHandler';
import { MockAuthRepository } from '../../data/mock';
import { AuthLoginUsecase } from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

// Mock the Screen so forms don't need to render — tests focus on orchestration
jest.mock('./AuthLoginScreen', () => ({
  AuthLoginScreen: () => null,
}));

// Mutable state container for the mocked controller
const authLoginCtrl = {
  state: {
    type: 'loaded' as string,
    errorMessage: null as string | null,
    values: { username: '', password: '' },
  },
  dispatch: jest.fn(),
  form: {} as never,
};

jest.mock('../controllers', () => ({
  useAuthLoginController: () => ({
    state: authLoginCtrl.state,
    dispatch: authLoginCtrl.dispatch,
    form: authLoginCtrl.form,
  }),
}));

const createProps = () => ({
  authLoginUsecase: new AuthLoginUsecase(new MockAuthRepository()),
});

describe('AuthLoginHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authLoginCtrl.state = {
      type: 'loaded',
      errorMessage: null,
      values: { username: '', password: '' },
    };
  });

  it('should navigate to "/" when state reaches submitSuccess', async () => {
    authLoginCtrl.state = {
      type: 'submitSuccess',
      errorMessage: null,
      values: { username: 'admin', password: 'secret' },
    };

    await act(async () => {
      render(<AuthLoginHandler {...createProps()} />);
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('should not navigate when state is loaded', async () => {
    authLoginCtrl.state = {
      type: 'loaded',
      errorMessage: null,
      values: { username: '', password: '' },
    };

    await act(async () => {
      render(<AuthLoginHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when state is submitting', async () => {
    authLoginCtrl.state = {
      type: 'submitting',
      errorMessage: null,
      values: { username: 'admin', password: 'secret' },
    };

    await act(async () => {
      render(<AuthLoginHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when state is submitError', async () => {
    authLoginCtrl.state = {
      type: 'submitError',
      errorMessage: 'Login failed',
      values: { username: 'admin', password: 'wrong' },
    };

    await act(async () => {
      render(<AuthLoginHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
