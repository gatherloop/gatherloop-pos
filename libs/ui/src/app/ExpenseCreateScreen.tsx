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
import { ExpenseCreateScreen as ExpenseCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ExpenseCreateScreenProps = {
  expenseCreateParams: ExpenseCreateParams;
};

export function ExpenseCreateScreen({
  expenseCreateParams,
}: ExpenseCreateScreenProps) {
  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const expenseUsecase = new ExpenseCreateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository,
    expenseCreateParams
  );

  return (
    <ExpenseCreateScreenView
      expenseCreateUsecase={expenseUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
