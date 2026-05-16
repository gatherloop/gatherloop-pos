import { ApiAuthRepository, ApiStockCheckRepository } from '../data';
import { AuthLogoutUsecase, StockCheckCreateUsecase, StockCheckCreateParams } from '../domain';
import { StockCheckCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type StockCheckCreateProps = {
  stockCheckCreateParams: StockCheckCreateParams;
};

export function StockCheckCreate({ stockCheckCreateParams }: StockCheckCreateProps) {
  const client = new QueryClient();
  const stockCheckRepository = new ApiStockCheckRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const stockCheckCreateUsecase = new StockCheckCreateUsecase(
    stockCheckRepository,
    stockCheckCreateParams
  );

  return (
    <StockCheckCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      stockCheckCreateUsecase={stockCheckCreateUsecase}
    />
  );
}
