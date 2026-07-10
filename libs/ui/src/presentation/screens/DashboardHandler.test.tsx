import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHandler } from './DashboardHandler';
import {
  MockAuthRepository,
  MockTransactionRepository,
  MockTransactionStatisticListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  TransactionStatisticListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: { authRepo?: MockAuthRepository } = {}
) => {
  const authRepo = options.authRepo ?? new MockAuthRepository();

  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    transactionStatisticListUsecase: new TransactionStatisticListUsecase(
      new MockTransactionRepository(),
      new MockTransactionStatisticListQueryRepository(),
      { transactionStatistics: [] }
    ),
  };
};

describe('DashboardHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the Dashboard layout with the Transaction Statistic section', async () => {
    render(<DashboardHandler {...createProps()} />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();

    await act(async () => {
      await flushPromises();
    });

    expect(
      screen.getByRole('heading', { name: 'Transaction Statistic' })
    ).toBeTruthy();
  });

  it('should log out when the sidebar logout button is pressed', async () => {
    const user = userEvent.setup();
    const authRepo = new MockAuthRepository();
    const logoutSpy = jest.spyOn(authRepo, 'logout');

    render(<DashboardHandler {...createProps({ authRepo })} />);

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logoutSpy).toHaveBeenCalled();
  });
});
