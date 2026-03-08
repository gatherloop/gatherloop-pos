import {
  ApiAuthRepository,
  ApiCouponRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  ApiVariantRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  CouponListParams,
  CouponListUsecase,
  TransactionCreateUsecase,
  TransactionItemSelectParams,
  TransactionItemSelectUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
} from '../domain';
import { TransactionCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCreateProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
  transactionPayParams: TransactionPayParams;
  couponListParams: CouponListParams;
};

export function TransactionCreate({
  transactionItemSelectParams,
  transactionPayParams,
  couponListParams,
}: TransactionCreateProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const transactionRepository = new ApiTransactionRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionCreateUsecase = new TransactionCreateUsecase(
    transactionRepository
  );
  const transactionPayUsecase = new TransactionPayUsecase(
    transactionRepository,
    walletRepository,
    transactionPayParams
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
    <TransactionCreateHandler
      transactionCreateUsecase={transactionCreateUsecase}
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      transactionPayUsecase={transactionPayUsecase}
      couponListUsecase={couponListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
