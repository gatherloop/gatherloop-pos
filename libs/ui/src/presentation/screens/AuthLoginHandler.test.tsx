import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
    const { getByText } = render(<AuthLoginHandler {...createProps()} />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('should render username and password input fields', () => {
    const { container } = render(<AuthLoginHandler {...createProps()} />);
    expect(container.querySelector('#username')).toBeTruthy();
    expect(container.querySelector('#password')).toBeTruthy();
  });

  it('should navigate to "/" after successful login', async () => {
    const { container, getByText } = render(<AuthLoginHandler {...createProps()} />);

    const usernameInput = container.querySelector('#username') as HTMLInputElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'secret' } });
    fireEvent.click(getByText('Submit'));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('should not navigate when login fails', async () => {
    const { container, getByText } = render(
      <AuthLoginHandler {...createProps({ shouldFail: true })} />
    );

    const usernameInput = container.querySelector('#username') as HTMLInputElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(getByText('Submit'));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when fields are empty (validation fails)', async () => {
    const { getByText } = render(<AuthLoginHandler {...createProps()} />);

    fireEvent.click(getByText('Submit'));

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
