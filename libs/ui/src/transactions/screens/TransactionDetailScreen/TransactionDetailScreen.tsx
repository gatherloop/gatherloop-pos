import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionDetail } from '../../components';
import { useTransactionDetailScreenState } from './TransactionDetailScreen.state';

export type TransactionDetailScreenProps = {
  transactionId: number;
};

export const TransactionDetailScreen = (
  props: TransactionDetailScreenProps
) => {
  const { transactionId } = useTransactionDetailScreenState({
    transactionId: props.transactionId,
  });
  return (
    <Layout title="Detail Transaction" showBackButton>
      <ScrollView>
        <TransactionDetail transactionId={transactionId} />
      </ScrollView>
    </Layout>
  );
};
