import { H4 } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionStatistic } from '../../widgets';

export const TransactionStatisticScreen = () => {
  return (
    <Layout title="Dashboard">
      <H4>Transaction Statistic</H4>
      <TransactionStatistic />
    </Layout>
  );
};
