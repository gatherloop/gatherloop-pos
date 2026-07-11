import { ApiAuthRepository, ApiBudgetRepository } from '../data';
import {
  AuthLogoutUsecase,
  BudgetUpdateParams,
  BudgetUpdateUsecase,
} from '../domain';
import { BudgetUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type BudgetUpdateProps = {
  budgetUpdateParams: BudgetUpdateParams;
};

export function BudgetUpdate({ budgetUpdateParams }: BudgetUpdateProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const budgetRepository = new ApiBudgetRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const budgetUpdateUsecase = new BudgetUpdateUsecase(
    budgetRepository,
    budgetUpdateParams
  );

  return (
    <BudgetUpdateHandler
      budgetUpdateUsecase={budgetUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
