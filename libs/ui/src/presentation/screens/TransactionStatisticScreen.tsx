import { H4 } from 'tamagui';
import { TransactionStatistic, Layout } from '../components';
import { useTransactionStatisticListController } from '../controllers';
import { TransactionStatisticListUsecase } from '../../domain';

export type TransactionStatisticScreenProps = {
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
};

export const TransactionStatisticScreen = (
  props: TransactionStatisticScreenProps
) => {
  const controller = useTransactionStatisticListController(
    props.transactionStatisticListUsecase
  );
  return (
    <Layout title="Dashboard">
      <H4>Transaction Statistic</H4>
      <TransactionStatistic {...controller} />
    </Layout>
  );
};
