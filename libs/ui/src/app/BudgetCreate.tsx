import { ApiAuthRepository, ApiBudgetRepository } from '../data';
import { AuthLogoutUsecase, BudgetCreateUsecase } from '../domain';
import { BudgetCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function BudgetCreate() {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const budgetRepository = new ApiBudgetRepository(client);

  const budgetCreateUsecase = new BudgetCreateUsecase(budgetRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <BudgetCreateHandler
      budgetCreateUsecase={budgetCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
