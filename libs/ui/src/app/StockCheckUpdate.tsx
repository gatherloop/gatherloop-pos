import { ApiAuthRepository, ApiStockCheckRepository } from '../data';
import { AuthLogoutUsecase, StockCheckUpdateUsecase, StockCheckUpdateParams } from '../domain';
import { StockCheckUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type StockCheckUpdateProps = {
  stockCheckUpdateParams: StockCheckUpdateParams;
};

export function StockCheckUpdate({ stockCheckUpdateParams }: StockCheckUpdateProps) {
  const client = new QueryClient();
  const stockCheckRepository = new ApiStockCheckRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const stockCheckUpdateUsecase = new StockCheckUpdateUsecase(
    stockCheckRepository,
    stockCheckUpdateParams
  );

  return (
    <StockCheckUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      stockCheckUpdateUsecase={stockCheckUpdateUsecase}
    />
  );
}
