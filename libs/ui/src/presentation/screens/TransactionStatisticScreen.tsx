import { H4 } from 'tamagui';
import { TransactionStatistic, Layout } from '../components';
import {
  useAuthLogoutController,
  useTransactionStatisticListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionStatisticListUsecase,
} from '../../domain';

export type TransactionStatisticScreenProps = {
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionStatisticScreen = (
  props: TransactionStatisticScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useTransactionStatisticListController(
    props.transactionStatisticListUsecase
  );
  return (
    <Layout {...authLogoutController} title="Dashboard">
      <H4>Transaction Statistic</H4>
      <TransactionStatistic {...controller} />
    </Layout>
  );
};
