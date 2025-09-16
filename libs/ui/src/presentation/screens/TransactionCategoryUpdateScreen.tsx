import { ScrollView } from 'tamagui';
import { TransactionCategoryFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTransactionCategoryUpdateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionCategoryUpdateUsecase,
} from '../../domain';

export type TransactionCategoryUpdateScreenProps = {
  transactionCategoryUpdateUsecase: TransactionCategoryUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCategoryUpdateScreen = (
  props: TransactionCategoryUpdateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionCategoryUpdateController =
    useTransactionCategoryUpdateController(
      props.transactionCategoryUpdateUsecase
    );

  const router = useRouter();

  useEffect(() => {
    if (transactionCategoryUpdateController.state.type === 'submitSuccess')
      router.push('/transaction-categories');
  }, [transactionCategoryUpdateController.state.type, router]);

  return (
    <Layout
      {...authLogoutController}
      title="Update Transaction Category"
      showBackButton
    >
      <ScrollView>
        <TransactionCategoryFormView {...transactionCategoryUpdateController} />
      </ScrollView>
    </Layout>
  );
};
