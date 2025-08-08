import {
  ApiAuthRepository,
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
} from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionUpdateScreenProps = {
  transactionUpdateParams: TransactionUpdateParams;
  transactionItemSelectParams: TransactionItemSelectParams;
};

export function TransactionUpdateScreen({
  transactionUpdateParams,
  transactionItemSelectParams,
}: TransactionUpdateScreenProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const authRepository = new ApiAuthRepository();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionUpdateUsecase = new TransactionUpdateUsecase(
    transactionRepository,
    transactionUpdateParams
  );
  const transactionItemSelectUsecase = new TransactionItemSelectUsecase(
    productRepository,
    variantRepository,
    transactionItemSelectParams
  );

  return (
    <TransactionUpdateScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
