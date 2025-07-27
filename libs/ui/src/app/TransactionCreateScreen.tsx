import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  UrlVariantListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  VariantListParams,
  VariantListUsecase,
  TransactionCreateUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
} from '../domain';
import { TransactionCreateScreen as TransactionCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCreateScreenProps = {
  variantListParams: VariantListParams;
  transactionPayParams: TransactionPayParams;
};

export function TransactionCreateScreen({
  variantListParams,
  transactionPayParams,
}: TransactionCreateScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const transactionRepository = new ApiTransactionRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();
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
  const variantListUsecase = new VariantListUsecase(
    variantRepository,
    variantListQueryRepository,
    variantListParams
  );

  return (
    <TransactionCreateScreenView
      variantListUsecase={variantListUsecase}
      transactionCreateUsecase={transactionCreateUsecase}
      transactionPayUsecase={transactionPayUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
