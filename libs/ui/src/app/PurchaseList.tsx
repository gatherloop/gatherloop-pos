import { ApiAuthRepository, ApiPurchaseListRepository } from '../data';
import {
  AuthLogoutUsecase,
  PurchaseListGetParams,
  PurchaseListGetUsecase,
} from '../domain';
import { PurchaseListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type StockCheckPurchaseListProps = {
  purchaseListGetParams: PurchaseListGetParams;
  getMaterialEditUrl?: (materialId: number) => string;
};

export function StockCheckPurchaseList({
  purchaseListGetParams,
  getMaterialEditUrl,
}: StockCheckPurchaseListProps) {
  const client = new QueryClient();
  const purchaseListRepository = new ApiPurchaseListRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const purchaseListGetUsecase = new PurchaseListGetUsecase(
    purchaseListRepository,
    purchaseListGetParams
  );

  return (
    <PurchaseListHandler
      authLogoutUsecase={authLogoutUsecase}
      purchaseListGetUsecase={purchaseListGetUsecase}
      getMaterialEditUrl={getMaterialEditUrl}
    />
  );
}
