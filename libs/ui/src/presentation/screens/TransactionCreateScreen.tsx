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
  TransactionForm,
  TransactionPayUsecase,
} from '../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';
import { print } from '../../utils';

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
      print({
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        name: transactionCreateController.form.getValues('name'),
        items: transactionCreateController.form
          .getValues('transactionItems')
          .map(({ product, amount, discountAmount }) => ({
            name: product.name,
            price: product.price,
            amount,
            discountAmount,
          })),
      });
      router.push('/transactions');
    }
  }, [
    router,
    transactionCreateController.form,
    transactionPayController.state.type,
  ]);

  const onCancelPayment = () => {
    router.push('/transactions');
  };

  const onProductItemPress = (
    product: Product,
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => {
    transactionCreateController.onAddItem(product, fieldArray);
    productListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionCreateController}
          ProductList={(fieldArray) => (
            <ProductList
              {...productListController}
              onItemPress={(product) => onProductItemPress(product, fieldArray)}
              isSearchAutoFocus
            />
          )}
        />
      </ScrollView>
      <TransactionPaymentAlert
        {...transactionPayController}
        onCancel={onCancelPayment}
      />
    </Layout>
  );
};
