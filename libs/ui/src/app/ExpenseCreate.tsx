import {
  ApiAuthRepository,
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ExpenseCreateParams,
  ExpenseCreateUsecase,
} from '../domain';
import { ExpenseCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ExpenseCreateProps = {
  expenseCreateParams: ExpenseCreateParams;
};

export function ExpenseCreate({ expenseCreateParams }: ExpenseCreateProps) {
  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const expenseCreateUsecase = new ExpenseCreateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository,
    expenseCreateParams
  );

  return (
    <ExpenseCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      expenseCreateUsecase={expenseCreateUsecase}
    />
  );
}
