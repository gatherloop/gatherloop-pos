import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  ApiProductRepository,
  ApiCouponRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionCreateUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
  TransactionItemSelectUsecase,
  TransactionItemSelectParams,
  CouponListUsecase,
  CouponListParams,
} from '../domain';
import { TransactionCreateScreen as TransactionCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCreateScreenProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
  transactionPayParams: TransactionPayParams;
  couponListParams: CouponListParams;
};

export function TransactionCreateScreen({
  transactionItemSelectParams,
  transactionPayParams,
  couponListParams,
}: TransactionCreateScreenProps) {
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
    <TransactionCreateScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      transactionCreateUsecase={transactionCreateUsecase}
      transactionPayUsecase={transactionPayUsecase}
      couponListUsecase={couponListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
