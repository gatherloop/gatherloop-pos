import { ScrollView } from 'tamagui';
import { TransactionDetail, Layout } from '../components';
import { AuthLogoutUsecase, TransactionDetailUsecase } from '../../domain';
import {
  useAuthLogoutController,
  useTransactionDetailController,
} from '../controllers';

export type TransactionDetailScreenProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionDetailScreen = (
  props: TransactionDetailScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useTransactionDetailController(
    props.transactionDetailUsecase
  );
  return (
    <Layout {...authLogoutController} title="Detail Transaction" showBackButton>
      <ScrollView>
        <TransactionDetail {...controller} />
      </ScrollView>
    </Layout>
  );
};
