import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionForm } from '../../components';
import { useTransactionUpdateScreenState } from './TransactionUpdateScreen.state';

export type TransactionUpdateScreenProps = {
  transactionId: number;
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
) => {
  const { transactionId, onSuccess } = useTransactionUpdateScreenState({
    transactionId: props.transactionId,
  });
  return (
    <Layout title="Update Transaction" showBackButton>
      <ScrollView>
        <TransactionForm
          variant={{ type: 'update', transactionId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
