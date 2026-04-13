import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  TransactionPaymentAlert,
  TransactionItemSelect,
  TransactionItemSelectProps,
  CouponList,
  CouponListProps,
} from '../components';
import { OptionValue, Product, TransactionForm, Wallet } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { Coupon } from '../../domain';

export type TransactionCreateScreenProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (values: TransactionForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  isCouponSheetOpen: boolean;
  onCouponSheetOpenChange: (open: boolean) => void;
  itemsFieldArray: UseFieldArrayReturn<
    TransactionForm,
    'transactionItems',
    'key'
  >;
  couponsFieldArray: UseFieldArrayReturn<
    TransactionForm,
    'transactionCoupons',
    'key'
  >;
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
    onItemPress: (coupon: Coupon) => void;
    onRetryButtonPress: () => void;
    variant: CouponListProps['variant'];
  };
  transactionPayment: {
    form: UseFormReturn<{ wallet: Wallet; paidAmount: number }>;
    isButtonDisabled: boolean;
    onCancel: () => void;
    isOpen: boolean;
    onSubmit: (values: { wallet: Wallet; paidAmount: number }) => void;
    transactionTotal: number;
    walletSelectOptions: { label: string; value: Wallet }[];
  };
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
  return (
    <Layout
      title="Create Transaction"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <TransactionFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          isCouponSheetOpen={props.isCouponSheetOpen}
          onCouponSheetOpenChange={props.onCouponSheetOpenChange}
          itemsFieldArray={props.itemsFieldArray}
          couponsFieldArray={props.couponsFieldArray}
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
              onRetryButtonPress={
                props.transactionItemSelect.onRetryButtonPress
              }
              onSearchValueChange={
                props.transactionItemSelect.onSearchValueChange
              }
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
          TransactionCouponList={() => (
            <CouponList
              onItemPress={props.couponList.onItemPress}
              onRetryButtonPress={props.couponList.onRetryButtonPress}
              variant={props.couponList.variant}
            />
          )}
        />
      </ScrollView>
      <TransactionPaymentAlert
        form={props.transactionPayment.form}
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
