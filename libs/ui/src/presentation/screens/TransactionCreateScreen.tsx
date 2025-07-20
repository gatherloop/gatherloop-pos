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
import { usePrinter } from '../../utils';
import dayjs from 'dayjs';

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
  const { print } = usePrinter();

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
        createdAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        paidAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
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
    print,
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
              numColumns={2}
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
