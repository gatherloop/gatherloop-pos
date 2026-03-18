import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthLoginHandler } from './AuthLoginHandler';
import { MockAuthRepository } from '../../data/mock';
import { AuthLoginUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const mockAuthRepo = new MockAuthRepository();
  if (options.shouldFail) mockAuthRepo.setShouldFail(true);
  return {
    authLoginUsecase: new AuthLoginUsecase(mockAuthRepo),
  };
};

describe('AuthLoginHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form initially', () => {
    render(<AuthLoginHandler {...createProps()} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('should render username and password input fields', () => {
    render(<AuthLoginHandler {...createProps()} />);
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Password' })).toBeTruthy();
  });

  it('should navigate to "/" after successful login', async () => {
    const user = userEvent.setup();
    render(<AuthLoginHandler {...createProps()} />);

    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'admin');
    await user.type(screen.getByRole('textbox', { name: 'Password' }), 'secret');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('should not navigate when login fails', async () => {
    const user = userEvent.setup();
    render(<AuthLoginHandler {...createProps({ shouldFail: true })} />);

    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'admin');
    await user.type(screen.getByRole('textbox', { name: 'Password' }), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when fields are empty (validation fails)', async () => {
    const user = userEvent.setup();
    render(<AuthLoginHandler {...createProps()} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate without any user interaction', async () => {
    render(<AuthLoginHandler {...createProps()} />);

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
