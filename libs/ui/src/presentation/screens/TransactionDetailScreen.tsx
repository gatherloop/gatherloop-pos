import { ScrollView } from 'tamagui';
import { TransactionDetail, Layout } from '../components';
import { TransactionDetailUsecase } from '../../domain';
import { useTransactionDetailController } from '../controllers';

export type TransactionDetailScreenProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
};

export const TransactionDetailScreen = (
  props: TransactionDetailScreenProps
) => {
  const controller = useTransactionDetailController(
    props.transactionDetailUsecase
  );
  return (
    <Layout title="Detail Transaction" showBackButton>
      <ScrollView>
        <TransactionDetail {...controller} />
      </ScrollView>
    </Layout>
  );
};
