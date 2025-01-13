import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  ProductList,
  TransactionPaymentAlert,
} from '../components';
import {
  useAuthLogoutController,
  useProductListController,
  useTransactionCreateController,
  useTransactionPayController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Product,
  ProductListUsecase,
  TransactionCreateUsecase,
  TransactionPayUsecase,
} from '../../domain';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  productListUsecase: ProductListUsecase;
  transactionPayUsecase: TransactionPayUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionCreateController = useTransactionCreateController(
    props.transactionCreateUsecase
  );

  const productListController = useProductListController(
    props.productListUsecase
  );

  const transactionPayController = useTransactionPayController(
    props.transactionPayUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (transactionCreateController.state.type === 'submitSuccess') {
      transactionPayController.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: transactionCreateController.state.transactionId ?? -1,
      });
    }
  }, [
    transactionCreateController.state.transactionId,
    transactionCreateController.state.type,
    transactionPayController,
  ]);

  useEffect(() => {
    if (transactionPayController.state.type === 'payingSuccess') {
      window.location.href = `/transactions/${transactionCreateController.state.transactionId}/print`;
    }
  }, [
    router,
    transactionCreateController.state.transactionId,
    transactionPayController.state.type,
  ]);

  const onCancelPayment = () => {
    router.push('/transactions');
  };

  const onProductItemPress = (product: Product) => {
    transactionCreateController.onAddItem(product);
    productListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionCreateController}
          ProductList={
            <ProductList
              {...productListController}
              onItemPress={onProductItemPress}
              isSearchAutoFocus
            />
          }
        />
      </ScrollView>
      <TransactionPaymentAlert
        {...transactionPayController}
        onCancel={onCancelPayment}
      />
    </Layout>
  );
};
