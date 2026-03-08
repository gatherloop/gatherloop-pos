import { ScrollView } from 'tamagui';
import {
  TransactionFormView,
  Layout,
  TransactionItemSelect,
  TransactionItemSelectProps,
  CouponList,
  CouponListProps,
} from '../components';
import { OptionValue, Product, TransactionForm, Coupon } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';

export type TransactionUpdateScreenProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (values: TransactionForm) => void;
  isSubmitDisabled: boolean;
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
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
) => {
  return (
    <Layout
      title="Update Transaction"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <TransactionFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isCouponSheetOpen={props.isCouponSheetOpen}
          onCouponSheetOpenChange={props.onCouponSheetOpenChange}
          itemsFieldArray={props.itemsFieldArray}
          couponsFieldArray={props.couponsFieldArray}
          TransactionItemSelect={() => (
            <TransactionItemSelect {...props.transactionItemSelect} />
          )}
          TransactionCouponList={() => (
            <CouponList {...props.couponList} />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
