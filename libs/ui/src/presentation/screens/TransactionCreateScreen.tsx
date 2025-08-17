import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  TransactionItemSelect,
  Layout,
  TransactionPaymentAlert,
  useConfirmationAlert,
  CouponList,
} from '../components';
import {
  useAuthLogoutController,
  useCouponListController,
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
  CouponListUsecase,
} from '../../domain';
import { usePrinter } from '../../utils';
import dayjs from 'dayjs';
import { useTransactionItemSelectController } from '../controllers/TransactionItemSelectController';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  transactionPayUsecase: TransactionPayUsecase;
  couponListUsecase: CouponListUsecase;
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

  const couponListController = useCouponListController(props.couponListUsecase);

  const router = useRouter();
  const { print } = usePrinter();
  const { show } = useConfirmationAlert();

  useEffect(() => {
    if (
      transactionCreateController.state.type === 'submitSuccess' &&
      transactionPayController.state.type === 'hidden'
    ) {
      let transactionTotal =
        transactionCreateController.state.values.transactionItems.reduce(
          (prev, curr) =>
            prev + (curr.variant.price * curr.amount - curr.discountAmount),
          0
        );

      transactionCreateController.state.values.transactionCoupons.forEach(
        (couponItem) => {
          const discountAmount =
            couponItem.coupon.type === 'fixed'
              ? couponItem.coupon.amount
              : couponItem.coupon.type === 'percentage'
              ? (transactionTotal * couponItem.coupon.amount) / 100
              : 0;
          transactionTotal -= discountAmount;
        }
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
    transactionCreateController.state.values.transactionCoupons,
    transactionCreateController.state.values.transactionItems,
    transactionPayController,
  ]);

  useEffect(() => {
    if (transactionPayController.state.type === 'payingSuccess') {
      const transaction = {
        createdAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        paidAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        name: transactionCreateController.form.getValues('name'),
        items: transactionCreateController.form
          .getValues('transactionItems')
          .map(({ variant, amount, discountAmount }) => ({
            name: `${variant.product.name} - ${variant.values
              .map(({ optionValue: { name } }) => name)
              .join(' - ')}`,
            price: variant.price,
            amount,
            discountAmount,
          })),
      };

      show({
        title: 'Print Invoice',
        description: 'Do you want to print invoice ?',
        onConfirm: () => {
          print({ type: 'INVOICE', transaction })
            .then(() => {
              show({
                title: 'Print Order Slip',
                description: 'Do you want to print order slip ?',
                onConfirm: () => {
                  print({ type: 'ORDER_SLIP', transaction }).then(() => {
                    router.push('/transactions');
                  });
                },
                onCancel: () => router.push('/transactions'),
              });
            })
            .catch(() => {
              router.push('/transactions');
            });
        },
        onCancel: () => router.push('/transactions'),
      });
    }
  }, [
    print,
    router,
    show,
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
          TransactionCouponList={() => (
            <CouponList
              {...couponListController}
              onItemPress={transactionCreateController.onAddCoupon}
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
