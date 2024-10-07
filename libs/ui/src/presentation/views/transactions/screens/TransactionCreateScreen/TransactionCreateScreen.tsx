import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionCreate } from '../../widgets';
import { useTransactionCreateController } from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const controller = useTransactionCreateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/transactions');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <TransactionCreate />
    </ScrollView>
  );
};

export const TransactionCreateScreen = () => {
  return (
    <Layout title="Create Transaction" showBackButton>
      <Content />
    </Layout>
  );
};
