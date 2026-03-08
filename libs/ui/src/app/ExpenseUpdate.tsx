import {
  ApiAuthRepository,
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ExpenseUpdateParams,
  ExpenseUpdateUsecase,
} from '../domain';
import { ExpenseUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ExpenseUpdateProps = {
  expenseUpdateParams: ExpenseUpdateParams;
};

export function ExpenseUpdate({
  expenseUpdateParams,
}: ExpenseUpdateProps) {
  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const expenseUpdateUsecase = new ExpenseUpdateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository,
    expenseUpdateParams
  );

  return (
    <ExpenseUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      expenseUpdateUsecase={expenseUpdateUsecase}
    />
  );
}
