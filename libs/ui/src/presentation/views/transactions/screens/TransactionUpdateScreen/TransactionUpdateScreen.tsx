import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionUpdate } from '../../widgets';
import { useTransactionUpdateController } from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const controller = useTransactionUpdateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/transactions');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <TransactionUpdate />
    </ScrollView>
  );
};

export const TransactionUpdateScreen = () => {
  return (
    <Layout title="Update Transaction" showBackButton>
      <Content />
    </Layout>
  );
};
