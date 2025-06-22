import { ApiAuthRepository, ApiTransactionRepository } from '../data';
import {
  AuthLogoutUsecase,
  TransactionStatisticListParams,
  TransactionStatisticListUsecase,
} from '../domain';
import { TransactionStatisticScreen as TransactionStatisticScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';
import { UrlTransactionStatisticListQueryRepository } from '../data/url/transactionStatisticListQuery';

export type TransactionStatisticScreenProps = {
  transactionStatisticListParams: TransactionStatisticListParams;
};

export function TransactionStatisticScreen({
  transactionStatisticListParams,
}: TransactionStatisticScreenProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionStatisticListusecase = new TransactionStatisticListUsecase(
    transactionRepository,
    transactionStatisticListQueryRepository,
    transactionStatisticListParams
  );

  return (
    <TransactionStatisticScreenView
      transactionStatisticListUsecase={transactionStatisticListusecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
