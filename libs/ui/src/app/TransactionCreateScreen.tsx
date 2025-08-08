import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  ApiProductRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionCreateUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
  TransactionItemSelectUsecase,
  TransactionItemSelectParams,
} from '../domain';
import { TransactionCreateScreen as TransactionCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCreateScreenProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
  transactionPayParams: TransactionPayParams;
};

export function TransactionCreateScreen({
  transactionItemSelectParams,
  transactionPayParams,
}: TransactionCreateScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const transactionRepository = new ApiTransactionRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
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
    transactionItemSelectParams
  );

  return (
    <TransactionCreateScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      transactionCreateUsecase={transactionCreateUsecase}
      transactionPayUsecase={transactionPayUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
