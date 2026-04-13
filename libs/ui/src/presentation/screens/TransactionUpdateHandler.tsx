import { useRouter } from 'solito/router';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (transactionUpdate.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionUpdate.state.type, router]);

  useEffect(() => {
    if (
      transactionItemSelect.state.type === 'loadingVariantSuccess' &&
      transactionItemSelect.state.selectedVariant
    ) {
      transactionUpdate.onAddItem(
        transactionItemSelect.state.selectedVariant,
        transactionItemSelect.state.amount
      );
    }
  }, [
    transactionUpdate,
    transactionItemSelect.state.amount,
    transactionItemSelect.state.selectedVariant,
    transactionItemSelect.state.type,
  ]);

  return (
    <TransactionUpdateScreen
      form={transactionUpdate.form}
      onSubmit={(values) =>
        transactionUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={transactionUpdate.state.type === 'submitting'}
      isSubmitting={transactionUpdate.state.type === 'submitting'}
      serverError={
        transactionUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      isCouponSheetOpen={transactionUpdate.isCouponSheetOpen}
      onCouponSheetOpenChange={transactionUpdate.onCouponSheetOpenChange}
      itemsFieldArray={transactionUpdate.itemsFieldArray}
      couponsFieldArray={transactionUpdate.couponsFieldArray}
      couponList={{
        onRetryButtonPress: () => couponList.dispatch({ type: 'FETCH' }),
        onItemPress: transactionUpdate.onAddCoupon,
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
