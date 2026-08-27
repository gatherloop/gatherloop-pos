import { ScrollView, YStack } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  TransactionItemSelect,
  TransactionItemSelectProps,
  CouponList,
  CouponListProps,
  useIsCompactLayout,
} from '../components';
import { FormVariant } from '../components/base';
import { OptionValue, Product, TransactionForm } from '../../domain';
import { MutableRefObject } from 'react';
import { UseFormReturn } from 'react-hook-form';

export type TransactionUpdateScreenProps = {
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
  serverError?: string;
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
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
        <TransactionItemSelect {...props.transactionItemSelect} />
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
      title="Update Transaction"
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
    </Layout>
  );
};
