import { ApiAuthRepository, ApiExpenseRepository } from '../data';
import {
  ExpenseListUsecase,
  ExpenseDeleteUsecase,
  AuthLogoutUsecase,
  ExpenseListParams,
} from '../domain';
import { ExpenseListScreen as ExpenseListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ExpenseListScreenProps = {
  expenseListParams: ExpenseListParams;
};

export function ExpenseListScreen({
  expenseListParams,
}: ExpenseListScreenProps) {
  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const expenseDeleteUsecase = new ExpenseDeleteUsecase(expenseRepository);
  const expenseListUsecase = new ExpenseListUsecase(
    expenseRepository,
    expenseListParams
  );

  return (
    <ExpenseListScreenView
      expenseDeleteUsecase={expenseDeleteUsecase}
      expenseListUsecase={expenseListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
