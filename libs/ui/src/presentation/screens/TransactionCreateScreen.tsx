import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  VariantList,
  TransactionPaymentAlert,
} from '../components';
import {
  useAuthLogoutController,
  useVariantListController,
  useTransactionCreateController,
  useTransactionPayController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Variant,
  VariantListUsecase,
  TransactionCreateUsecase,
  TransactionForm,
  TransactionPayUsecase,
} from '../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';
import { usePrinter } from '../../utils';
import dayjs from 'dayjs';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  variantListUsecase: VariantListUsecase;
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

  const variantListController = useVariantListController(
    props.variantListUsecase
  );

  const transactionPayController = useTransactionPayController(
    props.transactionPayUsecase
  );

  const router = useRouter();
  const { print } = usePrinter();

  useEffect(() => {
    if (transactionCreateController.state.type === 'submitSuccess') {
      const transactionTotal =
        transactionCreateController.state.values.transactionItems.reduce(
          (prev, curr) =>
            prev + (curr.variant.price * curr.amount - curr.discountAmount),
          0
        );

      transactionPayController.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: transactionCreateController.state.transactionId ?? -1,
        transactionTotal,
      });
    }
  }, [
    transactionCreateController.state.transactionId,
    transactionCreateController.state.type,
    transactionCreateController.state.values.transactionItems,
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
          .map(({ variant, amount, discountAmount }) => ({
            name: variant.name,
            price: variant.price,
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

  const onVariantItemPress = (
    variant: Variant,
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => {
    transactionCreateController.onAddItem(variant, fieldArray);
    variantListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionCreateController}
          VariantList={(fieldArray) => (
            <VariantList
              {...variantListController}
              onItemPress={(variant) => onVariantItemPress(variant, fieldArray)}
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
