import { ScrollView } from 'tamagui';
import { TransactionCategoryFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTransactionCategoryCreateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionCategoryCreateUsecase,
} from '../../domain';

export type TransactionCategoryCreateScreenProps = {
  transactionCategoryCreateUsecase: TransactionCategoryCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCategoryCreateScreen = (
  props: TransactionCategoryCreateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionCreateCreateController =
    useTransactionCategoryCreateController(
      props.transactionCategoryCreateUsecase
    );

  const router = useRouter();

  useEffect(() => {
    if (transactionCreateCreateController.state.type === 'submitSuccess')
      router.push('/transaction-categories');
  }, [transactionCreateCreateController.state.type, router]);

  return (
    <Layout
      {...authLogoutController}
      title="Create Transaction Category"
      showBackButton
    >
      <ScrollView>
        <TransactionCategoryFormView {...transactionCreateCreateController} />
      </ScrollView>
    </Layout>
  );
};
