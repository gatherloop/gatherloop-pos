import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  TransactionItemSelect,
} from '../components';
import {
  useAuthLogoutController,
  useTransactionUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  TransactionUpdateUsecase,
  TransactionItemSelectUsecase,
} from '../../domain';
import { useTransactionItemSelectController } from '../controllers/TransactionItemSelectController';

export type TransactionUpdateScreenProps = {
  transactionUpdateUsecase: TransactionUpdateUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionUpdateController = useTransactionUpdateController(
    props.transactionUpdateUsecase
  );

  const transactionItemSelectController = useTransactionItemSelectController(
    props.transactionItemSelectUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (transactionUpdateController.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionUpdateController.state.type, router]);

  useEffect(() => {
    if (
      transactionItemSelectController.state.type === 'loadingVariantSuccess' &&
      transactionItemSelectController.state.selectedVariant
    ) {
      transactionUpdateController.onAddItem(
        transactionItemSelectController.state.selectedVariant
      );
    }
  }, [
    transactionUpdateController,
    transactionItemSelectController.state.selectedVariant,
    transactionItemSelectController.state.type,
  ]);

  return (
    <Layout {...authLogoutController} title="Update Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionUpdateController}
          TransactionItemSelect={() => (
            <TransactionItemSelect {...transactionItemSelectController} />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
