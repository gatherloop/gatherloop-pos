import { ScrollView, YStack } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  TransactionPaymentAlert,
  TransactionItemSelect,
  TransactionItemSelectProps,
  CouponList,
  CouponListProps,
  useIsCompactLayout,
} from '../components';
import { FormVariant } from '../components/base';
import {
  OptionValue,
  Product,
  TransactionForm,
  TransactionPayForm,
  Wallet,
} from '../../domain';
import { MutableRefObject } from 'react';
import { UseFormReturn } from 'react-hook-form';

export type TransactionCreateScreenProps = {
  variant: FormVariant;
  defaultValues: TransactionForm;
  onSubmit: (values: TransactionForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  onLogoutPress: () => void;
  formRef?: MutableRefObject<UseFormReturn<TransactionForm> | null>;
  transactionItemSelect: {
    amount: number;
    currentPage: number;
    itemPerPage: number;
    onAmountChange: (amount: number) => void;
    onOptionValuesChange: (optionValues: OptionValue[]) => void;
    onPageChange: (page: number) => void;
    onRetryButtonPress: () => void;
    onSearchValueChange: (value: string) => void;
    onSelectProduct: (product: Product) => void;
    onSubmit: () => void;
    onUnselectProduct: () => void;
    products: Product[];
    searchValue: string;
    selectedOptionValues: OptionValue[];
    totalItem: number;
    variant: TransactionItemSelectProps['variant'];
    selectedProduct?: Product;
  };
  couponList: {
    onRetryButtonPress: () => void;
    variant: CouponListProps['variant'];
  };
  transactionPayment: {
    isButtonDisabled: boolean;
    onCancel: () => void;
    isOpen: boolean;
    onSubmit: (values: TransactionPayForm) => void;
    transactionTotal: number;
    walletSelectOptions: { label: string; value: Wallet }[];
  };
  serverError?: string;
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
  const isCompactLayout = useIsCompactLayout();

  const formView = (
    <TransactionFormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      onSubmit={props.onSubmit}
      isSubmitDisabled={props.isSubmitDisabled}
      isSubmitting={props.isSubmitting}
      isSubmitSuccess={props.isSubmitSuccess}
      formRef={props.formRef}
      serverError={props.serverError}
      TransactionItemSelect={() => (
        <TransactionItemSelect
          amount={props.transactionItemSelect.amount}
          currentPage={props.transactionItemSelect.currentPage}
          itemPerPage={props.transactionItemSelect.itemPerPage}
          onAmountChange={props.transactionItemSelect.onAmountChange}
          onOptionValuesChange={
            props.transactionItemSelect.onOptionValuesChange
          }
          onPageChange={props.transactionItemSelect.onPageChange}
          onRetryButtonPress={props.transactionItemSelect.onRetryButtonPress}
          onSearchValueChange={props.transactionItemSelect.onSearchValueChange}
          onSelectProduct={props.transactionItemSelect.onSelectProduct}
          onSubmit={props.transactionItemSelect.onSubmit}
          onUnselectProduct={props.transactionItemSelect.onUnselectProduct}
          products={props.transactionItemSelect.products}
          searchValue={props.transactionItemSelect.searchValue}
          selectedOptionValues={
            props.transactionItemSelect.selectedOptionValues
          }
          totalItem={props.transactionItemSelect.totalItem}
          variant={props.transactionItemSelect.variant}
          selectedProduct={props.transactionItemSelect.selectedProduct}
        />
      )}
      TransactionCouponList={(onItemPress) => (
        <CouponList
          onItemPress={onItemPress}
          onRetryButtonPress={props.couponList.onRetryButtonPress}
          variant={props.couponList.variant}
        />
      )}
    />
  );

  return (
    <Layout
      title="Create Transaction"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      {isCompactLayout ? (
        // On compact, the product picker owns a bounded `flex: 1` region
        // and scrolls internally — an outer `ScrollView` here would give it
        // no height to bound against (PRD FR-3).
        <YStack flex={1}>{formView}</YStack>
      ) : (
        <ScrollView>{formView}</ScrollView>
      )}
      <TransactionPaymentAlert
        isButtonDisabled={props.transactionPayment.isButtonDisabled}
        onCancel={props.transactionPayment.onCancel}
        isOpen={props.transactionPayment.isOpen}
        onSubmit={props.transactionPayment.onSubmit}
        transactionTotal={props.transactionPayment.transactionTotal}
        walletSelectOptions={props.transactionPayment.walletSelectOptions}
      />
    </Layout>
  );
};
