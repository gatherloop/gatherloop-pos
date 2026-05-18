import {
  ApiAuthRepository,
  ApiStockCheckRepository,
  UrlStockCheckListQueryRepository,
} from '../data';
import {
  StockCheckListUsecase,
  StockCheckDeleteUsecase,
  AuthLogoutUsecase,
  StockCheckListParams,
} from '../domain';
import { StockCheckListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type StockCheckListProps = {
  stockCheckListParams: StockCheckListParams;
};

export function StockCheckList({ stockCheckListParams }: StockCheckListProps) {
  const client = new QueryClient();
  const stockCheckRepository = new ApiStockCheckRepository(client);
  const stockCheckListQueryRepository = new UrlStockCheckListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const stockCheckDeleteUsecase = new StockCheckDeleteUsecase(stockCheckRepository);
  const stockCheckListUsecase = new StockCheckListUsecase(
    stockCheckRepository,
    stockCheckListQueryRepository,
    stockCheckListParams
  );

  return (
    <StockCheckListHandler
      authLogoutUsecase={authLogoutUsecase}
      stockCheckListUsecase={stockCheckListUsecase}
      stockCheckDeleteUsecase={stockCheckDeleteUsecase}
    />
  );
}
