import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import {
  useRentalCheckinController,
  useAuthLogoutController,
  useTransactionItemSelectController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  RentalCheckinUsecase,
  TransactionItemSelectUsecase,
} from '../../domain';
import {
  RentalCheckinScreen,
  RentalCheckinScreenProps,
} from './RentalCheckinScreen';

export type RentalCheckinHandlerProps = {
  rentalCheckinUsecase: RentalCheckinUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const RentalCheckinHandler = ({
  rentalCheckinUsecase,
  transactionItemSelectUsecase,
  authLogoutUsecase,
}: RentalCheckinHandlerProps) => {
  const router = useRouter();
  const rentalCheckin = useRentalCheckinController(rentalCheckinUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const transactionItemSelect = useTransactionItemSelectController(
    transactionItemSelectUsecase
  );

  useEffect(() => {
    if (
      transactionItemSelect.state.type === 'loadingVariantSuccess' &&
      transactionItemSelect.state.selectedVariant
    ) {
      rentalCheckin.onAddItem(
        transactionItemSelect.state.selectedVariant,
        transactionItemSelect.state.amount
      );
    }
  }, [
    rentalCheckin,
    transactionItemSelect.state.amount,
    transactionItemSelect.state.selectedVariant,
    transactionItemSelect.state.type,
  ]);

  useEffect(() => {
    if (rentalCheckin.state.type === 'submitSuccess') {
      router.push(`/rentals`);
    }
  }, [rentalCheckin.state.type, router]);

  return (
    <RentalCheckinScreen
      form={rentalCheckin.form}
      onSubmit={(values) =>
        rentalCheckin.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={rentalCheckin.state.type === 'submitting'}
      isSubmitting={rentalCheckin.state.type === 'submitting'}
      serverError={
        rentalCheckin.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      rentalsFieldArray={rentalCheckin.rentalsFieldArray}
      onToggleCustomizeCheckinDateTime={
        rentalCheckin.onToggleCustomizeCheckinDateTime
      }
      rentalItemSelect={{
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
            RentalCheckinScreenProps['rentalItemSelect']['variant']
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
