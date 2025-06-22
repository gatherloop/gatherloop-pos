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
import { ExpenseUpdateScreen as ExpenseUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ExpenseUpdateScreenProps = {
  expenseUpdateParams: ExpenseUpdateParams;
};

export function ExpenseUpdateScreen({
  expenseUpdateParams,
}: ExpenseUpdateScreenProps) {
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
    <ExpenseUpdateScreenView
      expenseUpdateUsecase={expenseUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
