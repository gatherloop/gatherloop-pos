import {
  ApiAuthRepository,
  ApiCouponRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  ApiVariantRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionUpdateParams,
  TransactionUpdateUsecase,
  TransactionItemSelectUsecase,
  TransactionItemSelectParams,
  CouponListUsecase,
  CouponListParams,
} from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionUpdateScreenProps = {
  transactionUpdateParams: TransactionUpdateParams;
  transactionItemSelectParams: TransactionItemSelectParams;
  couponListParams: CouponListParams;
};

export function TransactionUpdateScreen({
  transactionUpdateParams,
  transactionItemSelectParams,
  couponListParams,
}: TransactionUpdateScreenProps) {
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
    <TransactionUpdateScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
      couponListUsecase={couponListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
