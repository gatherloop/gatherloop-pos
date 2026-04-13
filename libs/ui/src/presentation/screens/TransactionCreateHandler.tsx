import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useTransactionCreateController,
  useAuthLogoutController,
  useTransactionItemSelectController,
  useTransactionPayController,
  useCouponListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionCreateUsecase,
  TransactionPayUsecase,
  TransactionItemSelectUsecase,
  CouponListUsecase,
} from '../../domain';
import { TransactionCreateScreen, TransactionCreateScreenProps } from './TransactionCreateScreen';
import {
  roundToNearest500,
  TransactionPrintPayload,
  usePrinter,
} from '../../utils';
import { useConfirmationAlert } from '../components';
import dayjs from 'dayjs';
import { match, P } from 'ts-pattern';

export type TransactionCreateHandlerProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  transactionPayUsecase: TransactionPayUsecase;
  couponListUsecase: CouponListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCreateHandler = ({
  transactionCreateUsecase,
  transactionItemSelectUsecase,
  transactionPayUsecase,
  couponListUsecase,
  authLogoutUsecase,
}: TransactionCreateHandlerProps) => {
  const router = useRouter();
  const { print } = usePrinter();
  const { show } = useConfirmationAlert();

  const transactionCreateController = useTransactionCreateController(
    transactionCreateUsecase
  );
  const transactionItemSelectController = useTransactionItemSelectController(
    transactionItemSelectUsecase
  );
  const transactionPayController = useTransactionPayController(
    transactionPayUsecase
  );
  const couponListController = useCouponListController(couponListUsecase);
  const authLogoutController = useAuthLogoutController(authLogoutUsecase);

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
              ? roundToNearest500(
                  (transactionTotal * couponItem.coupon.amount) / 100
                )
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
    const selectedWallet = transactionPayController.state.wallets.find(
      ({ id }) => id === transactionPayController.state.walletId
    );

    if (
      transactionPayController.state.type === 'payingSuccess' &&
      selectedWallet
    ) {
      const transaction: TransactionPrintPayload['transaction'] = {
        createdAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        paidAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        name: transactionCreateController.form.getValues('name'),
        orderNumber: transactionCreateController.form.getValues('orderNumber'),
        items: transactionCreateController.form
          .getValues('transactionItems')
          .sort((a, b) =>
            a.variant.product.name.localeCompare(b.variant.product.name)
          )
          .map(({ variant, amount, discountAmount, note }) => ({
            name: `${variant.product.name} - ${variant.values
              .map(({ optionValue: { name } }) => name)
              .join(' - ')}`,
            price: variant.price,
            amount,
            discountAmount,
            note,
          })),
        coupons: transactionCreateController.form
          .getValues('transactionCoupons')
          .map(({ coupon }) => ({
            amount: coupon.amount,
            type: coupon.type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
            code: coupon.code,
          })),
        isCashless: selectedWallet.isCashless,
        paidAmount: transactionPayController.state.paidAmount,
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
        onCancel: () => {
          setTimeout(() => {
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
          }, 200);
        },
      });
    }
  }, [
    print,
    router,
    show,
    transactionCreateController.form,
    transactionPayController.state.paidAmount,
    transactionPayController.state.type,
    transactionPayController.state.walletId,
    transactionPayController.state.wallets,
  ]);

  useEffect(() => {
    if (
      transactionItemSelectController.state.type === 'loadingVariantSuccess' &&
      transactionItemSelectController.state.selectedVariant
    ) {
      transactionCreateController.onAddItem(
        transactionItemSelectController.state.selectedVariant,
        transactionItemSelectController.state.amount
      );
    }
  }, [
    transactionCreateController,
    transactionItemSelectController.state.amount,
    transactionItemSelectController.state.selectedVariant,
    transactionItemSelectController.state.type,
  ]);

  const props: TransactionCreateScreenProps = {
    form: transactionCreateController.form,
    onSubmit: (values) =>
      transactionCreateController.dispatch({ type: 'SUBMIT', values }),
    isSubmitDisabled: transactionCreateController.state.type === 'submitting',
    isSubmitting: transactionCreateController.state.type === 'submitting',
    serverError:
      transactionCreateController.state.type === 'submitError'
        ? 'Failed to submit. Please try again.'
        : undefined,
    onLogoutPress: () => authLogoutController.dispatch({ type: 'LOGOUT' }),
    isCouponSheetOpen: transactionCreateController.isCouponSheetOpen,
    onCouponSheetOpenChange:
      transactionCreateController.onCouponSheetOpenChange,
    itemsFieldArray: transactionCreateController.itemsFieldArray,
    couponsFieldArray: transactionCreateController.couponsFieldArray,
    couponList: {
      onRetryButtonPress: () =>
        couponListController.dispatch({ type: 'FETCH' }),
      onItemPress: transactionCreateController.onAddCoupon,
      variant: match(couponListController.state)
        .returnType<TransactionCreateScreenProps['couponList']['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ coupons }) => ({
          type: coupons.length > 0 ? 'loaded' : 'empty',
          coupons,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive(),
    },
    transactionItemSelect: {
      amount: transactionItemSelectController.state.amount,
      currentPage: transactionItemSelectController.state.page,
      itemPerPage: transactionItemSelectController.state.itemPerPage,
      onAmountChange: (amount) =>
        transactionItemSelectController.dispatch({
          type: 'CHANGE_AMOUNT',
          amount,
        }),
      onOptionValuesChange: (optionValues) =>
        transactionItemSelectController.dispatch({
          type: 'UPDATE_OPTION_VALUES',
          optionValues,
        }),
      onPageChange: (page) =>
        transactionItemSelectController.dispatch({
          type: 'CHANGE_PARAMS',
          page,
        }),
      onRetryButtonPress: () =>
        transactionItemSelectController.dispatch({ type: 'FETCH' }),
      onSearchValueChange: (query) =>
        transactionItemSelectController.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          fetchDebounceDelay: 600,
        }),
      onSelectProduct: (product) =>
        transactionItemSelectController.dispatch({
          type: 'SELECT_PRODUCT',
          product,
        }),
      onSubmit: () =>
        transactionItemSelectController.dispatch({ type: 'FETCH_VARIANT' }),
      onUnselectProduct: () =>
        transactionItemSelectController.dispatch({ type: 'UNSELECT_PRODUCT' }),
      products: transactionItemSelectController.state.products,
      searchValue: transactionItemSelectController.state.query,
      selectedOptionValues:
        transactionItemSelectController.state.selectedOptionValues,
      totalItem: transactionItemSelectController.state.totalItem,
      selectedProduct: transactionItemSelectController.state.selectedProduct,
      variant: match(transactionItemSelectController.state)
        .returnType<
          TransactionCreateScreenProps['transactionItemSelect']['variant']
        >()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ products }) => ({ type: products.length > 0 ? 'loaded' : 'empty' })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .with({ type: 'selectingOptions' }, () => ({
          type: 'selectingOptions',
        }))
        .with({ type: 'loadingVariant' }, () => ({ type: 'submitting' }))
        .with({ type: 'loadingVariantSuccess' }, () => ({ type: 'submited' }))
        .exhaustive(),
    },
    transactionPayment: {
      form: transactionPayController.form,
      isButtonDisabled:
        transactionPayController.state.type === 'paying' ||
        transactionPayController.state.type === 'payingSuccess',
      isOpen:
        transactionPayController.state.type === 'shown' ||
        transactionPayController.state.type === 'paying' ||
        transactionPayController.state.type === 'payingSuccess' ||
        transactionPayController.state.type === 'payingError',
      onCancel: () =>
        transactionPayController.dispatch({ type: 'HIDE_CONFIRMATION' }),
      onSubmit: (values) =>
        transactionPayController.dispatch({
          type: 'PAY',
          walletId: values.wallet.id,
          paidAmount: values.paidAmount,
        }),
      transactionTotal: transactionPayController.state.transactionTotal,
      walletSelectOptions: transactionPayController.state.wallets.map(
        (wallet) => ({
          label: wallet.name,
          value: wallet,
        })
      ),
    },
  };

  return <TransactionCreateScreen {...props} />;
};
