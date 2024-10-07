import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionDetail } from '../../widgets';

export const TransactionDetailScreen = () => {
  return (
    <Layout title="Detail Transaction" showBackButton>
      <ScrollView>
        <TransactionDetail />
      </ScrollView>
    </Layout>
  );
};
