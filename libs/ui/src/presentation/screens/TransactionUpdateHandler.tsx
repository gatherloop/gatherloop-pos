import { useRouter } from 'solito/router';
import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { match, P } from 'ts-pattern';
import {
  useTransactionUpdateController,
  useAuthLogoutController,
  useTransactionItemSelectController,
  useCouponListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionUpdateUsecase,
  TransactionItemSelectUsecase,
  CouponListUsecase,
  Variant,
  TransactionForm,
} from '../../domain';
import {
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
} from './TransactionUpdateScreen';

export type TransactionUpdateHandlerProps = {
  transactionUpdateUsecase: TransactionUpdateUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  couponListUsecase: CouponListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionUpdateHandler = ({
  transactionUpdateUsecase,
  transactionItemSelectUsecase,
  couponListUsecase,
  authLogoutUsecase,
}: TransactionUpdateHandlerProps) => {
  const router = useRouter();
  const transactionUpdate = useTransactionUpdateController(
    transactionUpdateUsecase
  );
  const transactionItemSelect = useTransactionItemSelectController(
    transactionItemSelectUsecase
  );
  const couponList = useCouponListController(couponListUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  const formRef = useRef<UseFormReturn<TransactionForm> | null>(null);

  // Writes through the form the same way an item selection would if it
  // happened from inside the form subtree — see `FormView`'s `formRef`
  // escape hatch (TRD §4.6). `formRef.current` is only ever null before the
  // form's `loaded` branch mounts, which is not reachable here since a
  // variant selection requires the product picker (and therefore the form)
  // to already be on screen.
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
    if (transactionUpdate.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionUpdate.state.type, router]);

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

  return (
    <TransactionUpdateScreen
      variant={match(transactionUpdate.state)
        .returnType<TransactionUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitting',
              'submitSuccess',
              'submitError'
            ),
          },
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () =>
            transactionUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
      defaultValues={transactionUpdate.state.values}
      onSubmit={(values) =>
        transactionUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={transactionUpdate.state.type === 'submitting'}
      isSubmitting={transactionUpdate.state.type === 'submitting'}
      isSubmitSuccess={transactionUpdate.state.type === 'submitSuccess'}
      serverError={
        transactionUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      formRef={formRef}
      couponList={{
        onRetryButtonPress: () => couponList.dispatch({ type: 'FETCH' }),
        variant: match(couponList.state)
          .returnType<
            TransactionUpdateScreenProps['couponList']['variant']
          >()
          .with({ type: P.union('idle', 'loading') }, () => ({
            type: 'loading',
          }))
          .with(
            { type: P.union('loaded', 'revalidating') },
            ({ coupons }) => ({
              type: coupons.length > 0 ? 'loaded' : 'empty',
              coupons,
            })
          )
          .with({ type: 'error' }, () => ({ type: 'error' }))
          .exhaustive(),
      }}
      transactionItemSelect={{
        amount: transactionItemSelect.state.amount,
        currentPage: transactionItemSelect.state.page,
        itemPerPage: transactionItemSelect.state.itemPerPage,
        onAmountChange: (amount) =>
          transactionItemSelect.dispatch({ type: 'CHANGE_AMOUNT', amount }),
        onOptionValuesChange: (optionValues) =>
          transactionItemSelect.dispatch({
            type: 'UPDATE_OPTION_VALUES',
            optionValues,
          }),
        onPageChange: (page) =>
          transactionItemSelect.dispatch({ type: 'CHANGE_PARAMS', page }),
        onRetryButtonPress: () =>
          transactionItemSelect.dispatch({ type: 'FETCH' }),
        onSearchValueChange: (query) =>
          transactionItemSelect.dispatch({ type: 'CHANGE_PARAMS', query }),
        onSelectProduct: (product) =>
          transactionItemSelect.dispatch({ type: 'SELECT_PRODUCT', product }),
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
            TransactionUpdateScreenProps['transactionItemSelect']['variant']
          >()
          .with({ type: P.union('idle', 'loading') }, () => ({
            type: 'loading',
          }))
          .with(
            { type: P.union('changingParams', 'loaded', 'revalidating') },
            ({ products }) => ({
              type: products.length > 0 ? 'loaded' : 'empty',
            })
          )
          .with({ type: 'error' }, () => ({ type: 'error' }))
          .with({ type: 'selectingOptions' }, () => ({
            type: 'selectingOptions',
          }))
          .with({ type: 'loadingVariant' }, () => ({ type: 'submitting' }))
          .with({ type: 'loadingVariantSuccess' }, () => ({
            type: 'submited',
          }))
          .exhaustive(),
      }}
    />
  );
};
