import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionForm } from '../../components';
import { useTransactionCreateScreenState } from './TransactionCreateScreen.state';

export const TransactionCreateScreen = () => {
  const { onSuccess } = useTransactionCreateScreenState();
  return (
    <Layout title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
