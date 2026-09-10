import { useRouter } from 'solito/router';
import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout, useTransactionItemSelect, useTransactionPay, useCouponList } from '../hooks';
import {
  AuthLogoutUsecase,
  TransactionCreateUsecase,
  TransactionPayUsecase,
  TransactionItemSelectUsecase,
  CouponListUsecase,
  Variant,
  TransactionForm,
} from '../../../domain';
import {
  TransactionCreateScreen,
  TransactionCreateScreenProps,
} from '../../views/screens/pos/TransactionCreateScreen';
import {
  buildOrderSlipPayload,
  OrderSlipSource,
  roundToNearest500,
  TransactionPrintPayload,
  usePrinter,
} from '../../../utils';
import { useConfirmationAlert } from '../../views/components';
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
  const toast = useToastController();

  const transactionCreate = useUsecase(transactionCreateUsecase);
  const transactionItemSelect = useTransactionItemSelect(
    transactionItemSelectUsecase
  );
  const transactionPay = useTransactionPay(
    transactionPayUsecase
  );
  const couponList = useCouponList(couponListUsecase);
  const authLogout = useAuthLogout(authLogoutUsecase);

  const formRef = useRef<UseFormReturn<TransactionForm> | null>(null);

  const addItemToForm = (newVariant: Variant, amount: number) => {
    const form = formRef.current;
    if (!form) return;

    const items = form.getValues('transactionItems');
    const itemIndex = items.findIndex(
      ({ variant }) => newVariant.id === variant.id
    );

    if (itemIndex !== -1) {
      form.setValue(
        'transactionItems',
        items.map((item, index) =>
          index === itemIndex ? { ...item, amount: item.amount + amount } : item
        )
      );
    } else {
      form.setValue('transactionItems', [
        ...items,
        {
          amount,
          variant: newVariant,
          price: newVariant.price,
          discountAmount: 0,
          note: '',
        },
      ]);
    }
  };

  useEffect(() => {
    if (transactionCreate.state.type === 'submitSuccess')
      toast.show('Create Transaction Success');
    else if (transactionCreate.state.type === 'submitError')
      toast.show('Create Transaction Error');
  }, [toast, transactionCreate.state.type]);

  useEffect(() => {
    if (
      transactionCreate.state.type === 'submitSuccess' &&
      transactionPay.state.type === 'hidden'
    ) {
      let transactionTotal =
        transactionCreate.state.values.transactionItems.reduce(
          (prev, curr) =>
            prev + (curr.variant.price * curr.amount - curr.discountAmount),
          0
        );

      transactionCreate.state.values.transactionCoupons.forEach(
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

      transactionPay.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: transactionCreate.state.transactionId ?? -1,
        transactionTotal,
      });
    }
  }, [
    transactionCreate.state.transactionId,
    transactionCreate.state.type,
    transactionCreate.state.values.transactionCoupons,
    transactionCreate.state.values.transactionItems,
    transactionPay,
  ]);

  useEffect(() => {
    const selectedWallet = transactionPay.state.wallets.find(
      ({ id }) => id === transactionPay.state.walletId
    );

    if (
      transactionPay.state.type === 'payingSuccess' &&
      selectedWallet
    ) {
      const transactionItems =
        transactionCreate.state.values.transactionItems
          .slice()
          .sort((a, b) =>
            a.variant.product.name.localeCompare(b.variant.product.name)
          );

      const transaction: TransactionPrintPayload = {
        createdAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        paidAt: dayjs(new Date().toISOString()).format('DD/MM/YYYY HH:mm'),
        name: transactionCreate.state.values.name,
        orderNumber: transactionCreate.state.values.orderNumber,
        items: transactionItems.map(
          ({ variant, price, amount, discountAmount, note }) => ({
            name: `${variant.product.name} - ${variant.values
              .map(({ optionValue: { name } }) => name)
              .join(' - ')}`,
            price,
            amount,
            discountAmount,
            note,
          })
        ),
        coupons: transactionCreate.state.values.transactionCoupons.map(
          ({ coupon }) => ({
            amount: coupon.amount,
            type: coupon.type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
            code: coupon.code,
          })
        ),
        isCashless: selectedWallet.isCashless,
        paidAmount: transactionPay.state.paidAmount,
      };

      const orderSlipSource: OrderSlipSource = {
        ...transaction,
        items: transactionItems,
      };

      const orderSlip = buildOrderSlipPayload(orderSlipSource);

      const promptOrderSlip = () => {
        if (!orderSlip) {
          router.push('/transactions');
          return;
        }

        show({
          title: 'Print Order Slip',
          description: 'Do you want to print order slip ?',
          onConfirm: () => {
            print(orderSlip).then(() => router.push('/transactions'));
          },
          onCancel: () => router.push('/transactions'),
        });
      };

      show({
        title: 'Print Invoice',
        description: 'Do you want to print invoice ?',
        onConfirm: () => {
          print({ type: 'INVOICE', transaction })
            .then(promptOrderSlip)
            .catch(() => {
              router.push('/transactions');
            });
        },
        onCancel: () => setTimeout(promptOrderSlip, 200),
      });
    }
  }, [
    print,
    router,
    show,
    transactionCreate.state.values,
    transactionPay.state.paidAmount,
    transactionPay.state.type,
    transactionPay.state.walletId,
    transactionPay.state.wallets,
  ]);

  useEffect(() => {
    if (
      transactionItemSelect.state.type === 'loadingVariantSuccess' &&
      transactionItemSelect.state.selectedVariant
    ) {
      addItemToForm(
        transactionItemSelect.state.selectedVariant,
        transactionItemSelect.state.amount
      );
    }
  }, [
    transactionItemSelect.state.amount,
    transactionItemSelect.state.selectedVariant,
    transactionItemSelect.state.type,
  ]);

  const props: TransactionCreateScreenProps = {
    variant: { type: 'loaded' },
    defaultValues: transactionCreate.state.values,
    onSubmit: (values) =>
      transactionCreate.dispatch({ type: 'SUBMIT', values }),
    isSubmitDisabled: transactionCreate.state.type === 'submitting',
    isSubmitting: transactionCreate.state.type === 'submitting',
    isSubmitSuccess:
      transactionCreate.state.type === 'submitSuccess',
    serverError:
      transactionCreate.state.type === 'submitError'
        ? 'Failed to submit. Please try again.'
        : undefined,
    onLogoutPress: () => authLogout.dispatch({ type: 'LOGOUT' }),
    formRef,
    couponList: {
      onRetryButtonPress: () =>
        couponList.dispatch({ type: 'FETCH' }),
      variant: match(couponList.state)
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
      amount: transactionItemSelect.state.amount,
      currentPage: transactionItemSelect.state.page,
      itemPerPage: transactionItemSelect.state.itemPerPage,
      onAmountChange: (amount) =>
        transactionItemSelect.dispatch({
          type: 'CHANGE_AMOUNT',
          amount,
        }),
      onOptionValuesChange: (optionValues) =>
        transactionItemSelect.dispatch({
          type: 'UPDATE_OPTION_VALUES',
          optionValues,
        }),
      onPageChange: (page) =>
        transactionItemSelect.dispatch({
          type: 'CHANGE_PARAMS',
          page,
        }),
      onRetryButtonPress: () =>
        transactionItemSelect.dispatch({ type: 'FETCH' }),
      onSearchValueChange: (query) =>
        transactionItemSelect.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          fetchDebounceDelay: 600,
        }),
      onSelectProduct: (product) =>
        transactionItemSelect.dispatch({
          type: 'SELECT_PRODUCT',
          product,
        }),
      onSubmit: () =>
        transactionItemSelect.dispatch({ type: 'FETCH_VARIANT' }),
      onUnselectProduct: () =>
        transactionItemSelect.dispatch({ type: 'UNSELECT_PRODUCT' }),
      products: transactionItemSelect.state.products,
      searchValue: transactionItemSelect.state.query,
      selectedOptionValues:
        transactionItemSelect.state.selectedOptionValues,
      totalItem: transactionItemSelect.state.totalItem,
      selectedProduct: transactionItemSelect.state.selectedProduct,
      variant: match(transactionItemSelect.state)
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
      isButtonDisabled:
        transactionPay.state.type === 'paying' ||
        transactionPay.state.type === 'payingSuccess',
      isOpen:
        transactionPay.state.type === 'shown' ||
        transactionPay.state.type === 'paying' ||
        transactionPay.state.type === 'payingSuccess' ||
        transactionPay.state.type === 'payingError',
      onCancel: () => router.push('/transactions'),
      onSubmit: (values) =>
        transactionPay.dispatch({
          type: 'PAY',
          walletId: values.wallet.id,
          paidAmount: values.paidAmount,
        }),
      transactionTotal: transactionPay.state.transactionTotal,
      walletSelectOptions: transactionPay.state.wallets
        .filter((wallet) => wallet.isPaymentTarget)
        .map((wallet) => ({
          label: wallet.name,
          value: wallet,
        })),
    },
  };

  return <TransactionCreateScreen {...props} />;
};
