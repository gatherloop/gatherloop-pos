import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  TransactionItemSelect,
  Layout,
  TransactionPaymentAlert,
} from '../components';
import {
  useAuthLogoutController,
  useTransactionCreateController,
  useTransactionPayController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  TransactionCreateUsecase,
  TransactionPayUsecase,
  TransactionItemSelectUsecase,
} from '../../domain';
import { usePrinter } from '../../utils';
import dayjs from 'dayjs';
import { useTransactionItemSelectController } from '../controllers/TransactionItemSelectController';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
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

  const transactionItemSelectController = useTransactionItemSelectController(
    props.transactionItemSelectUsecase
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

  useEffect(() => {
    if (
      transactionItemSelectController.state.type === 'loadingVariantSuccess' &&
      transactionItemSelectController.state.selectedVariant
    ) {
      transactionCreateController.onAddItem(
        transactionItemSelectController.state.selectedVariant
      );
    }
  }, [
    transactionCreateController,
    transactionItemSelectController.state.selectedVariant,
    transactionItemSelectController.state.type,
  ]);

  const onCancelPayment = () => {
    router.push('/transactions');
  };

  return (
    <Layout {...authLogoutController} title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionCreateController}
          TransactionItemSelect={() => (
            <TransactionItemSelect {...transactionItemSelectController} />
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
