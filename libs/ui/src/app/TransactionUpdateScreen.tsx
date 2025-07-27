import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiTransactionRepository,
  UrlVariantListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  VariantListParams,
  VariantListUsecase,
  TransactionUpdateParams,
  TransactionUpdateUsecase,
} from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionUpdateScreenProps = {
  transactionUpdateParams: TransactionUpdateParams;
  variantListParams: VariantListParams;
};

export function TransactionUpdateScreen({
  transactionUpdateParams,
  variantListParams,
}: TransactionUpdateScreenProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionUpdateUsecase = new TransactionUpdateUsecase(
    transactionRepository,
    transactionUpdateParams
  );
  const variantListUsecase = new VariantListUsecase(
    variantRepository,
    variantListQueryRepository,
    variantListParams
  );

  return (
    <TransactionUpdateScreenView
      variantListUsecase={variantListUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
