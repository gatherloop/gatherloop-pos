import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
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
    render(<AuthLoginHandler {...createProps()} />);
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('should navigate to "/" after successful login', async () => {
    const { getByText } = render(<AuthLoginHandler {...createProps()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(getByText('Submit'));

    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('should not navigate when login fails', async () => {
    const { getByText } = render(
      <AuthLoginHandler {...createProps({ shouldFail: true })} />
    );

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
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
