import { ApiAuthRepository, ApiPurchaseListRepository, UrlPurchaseListQueryRepository } from '../data';
import {
  AuthLogoutUsecase,
  PurchaseListGetParams,
  PurchaseListGetUsecase,
} from '../domain';
import { PurchaseListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type StockCheckPurchaseListProps = {
  purchaseListGetParams: PurchaseListGetParams;
};

export function StockCheckPurchaseList({
  purchaseListGetParams,
}: StockCheckPurchaseListProps) {
  const client = new QueryClient();
  const purchaseListRepository = new ApiPurchaseListRepository(client);
  const purchaseListQueryRepository = new UrlPurchaseListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const purchaseListGetUsecase = new PurchaseListGetUsecase(
    purchaseListRepository,
    purchaseListQueryRepository,
    purchaseListGetParams
  );

  return (
    <PurchaseListHandler
      authLogoutUsecase={authLogoutUsecase}
      purchaseListGetUsecase={purchaseListGetUsecase}
    />
  );
}
