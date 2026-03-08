import {
  ApiAuthRepository,
  ApiCouponRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  ApiVariantRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  CouponListParams,
  CouponListUsecase,
  TransactionItemSelectParams,
  TransactionItemSelectUsecase,
  TransactionUpdateParams,
  TransactionUpdateUsecase,
} from '../domain';
import { TransactionUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionUpdateProps = {
  transactionUpdateParams: TransactionUpdateParams;
  transactionItemSelectParams: TransactionItemSelectParams;
  couponListParams: CouponListParams;
};

export function TransactionUpdate({
  transactionUpdateParams,
  transactionItemSelectParams,
  couponListParams,
}: TransactionUpdateProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const authRepository = new ApiAuthRepository();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const couponRepository = new ApiCouponRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionUpdateUsecase = new TransactionUpdateUsecase(
    transactionRepository,
    transactionUpdateParams
  );
  const transactionItemSelectUsecase = new TransactionItemSelectUsecase(
    productRepository,
    variantRepository,
    { ...transactionItemSelectParams, saleType: 'purchase' }
  );
  const couponListUsecase = new CouponListUsecase(
    couponRepository,
    couponListParams
  );

  return (
    <TransactionUpdateHandler
      transactionUpdateUsecase={transactionUpdateUsecase}
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      couponListUsecase={couponListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
