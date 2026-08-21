import { ScrollView, useMedia, YStack } from 'tamagui';
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
  onItemCouponSheetOpen: (index: number) => void;
  onRemoveItemCoupon: (index: number) => void;
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
  serverError?: string;
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
  const media = useMedia();

  const itemSelect = (
    <TransactionItemSelect
      amount={props.transactionItemSelect.amount}
      currentPage={props.transactionItemSelect.currentPage}
      itemPerPage={props.transactionItemSelect.itemPerPage}
      onAmountChange={props.transactionItemSelect.onAmountChange}
      onOptionValuesChange={props.transactionItemSelect.onOptionValuesChange}
      onPageChange={props.transactionItemSelect.onPageChange}
      onRetryButtonPress={props.transactionItemSelect.onRetryButtonPress}
      onSearchValueChange={props.transactionItemSelect.onSearchValueChange}
      onSelectProduct={props.transactionItemSelect.onSelectProduct}
      onSubmit={props.transactionItemSelect.onSubmit}
      onUnselectProduct={props.transactionItemSelect.onUnselectProduct}
      products={props.transactionItemSelect.products}
      searchValue={props.transactionItemSelect.searchValue}
      selectedOptionValues={props.transactionItemSelect.selectedOptionValues}
      totalItem={props.transactionItemSelect.totalItem}
      variant={props.transactionItemSelect.variant}
      selectedProduct={props.transactionItemSelect.selectedProduct}
    />
  );

  return (
    <Layout
      title="Create Transaction"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      {/* FR-7 (docs/prd-transaction-mobile-ux.md, Phase 7): on `$xs` the
          picker is mounted here, as a flex-bounded sibling of the form's
          ScrollView, instead of nested inside it — its own FlatList is a
          VirtualizedList, and nesting one inside a plain ScrollView is what
          left it with no bounded height to scroll within (same fix
          ProductListScreen already relies on: a FlatList filling a flex
          container, never wrapped in a ScrollView). The
          TransactionItemSelect slot passed to TransactionFormView below
          renders null on `$xs` since the picker is already mounted here.

          `flexBasis={0}` on both this wrapper and the ScrollView's `$xs`
          override is required for the split to hold regardless of content
          height: react-native-web's `flex` prop only sets
          flex-grow/flex-shrink, leaving flex-basis at its CSS default
          `auto` (content size) — with two `auto`-basis siblings the taller
          one's content dominates instead of splitting by the given ratio.
          The 3:2 ratio favors the picker, since browsing/adding products is
          the repeated action on this screen; the summary form below already
          relies on its own scroll (Phase 6's sticky Total/Submit bar keeps
          the total visible regardless of scroll position there).

          The ScrollView's `flex`/`flexBasis` are set only via the `$xs`
          media prop, not unconditionally: above `$xs` this ScrollView is
          the sole child here (no picker sibling), and forcing
          `flexBasis={0}` on it there breaks its content-based auto-sizing
          when no ancestor has a real bounded height — which is exactly
          Storybook's non-mobile stories, since only the app's real
          `body{height:100%;overflow:hidden}` (missing in Storybook)
          normally gives this branch a bounded ancestor to grow into. */}
      {media.xs && (
        <YStack flex={3} flexBasis={0}>
          {itemSelect}
        </YStack>
      )}
      <ScrollView $xs={{ flex: 2, flexBasis: 0 }}>
        {/* Phase 6 (FR-6): bottom padding matching the `$xs` sticky
            Total/Submit bar in TransactionFormView, so it never covers the
            last item while scrolling. */}
        <YStack $xs={{ paddingBottom: '$8' }}>
          <TransactionFormView
            form={props.form}
            onSubmit={props.onSubmit}
            isSubmitDisabled={props.isSubmitDisabled}
            isSubmitting={props.isSubmitting}
            isCouponSheetOpen={props.isCouponSheetOpen}
            onCouponSheetOpenChange={props.onCouponSheetOpenChange}
            onItemCouponSheetOpen={props.onItemCouponSheetOpen}
            onRemoveItemCoupon={props.onRemoveItemCoupon}
            itemsFieldArray={props.itemsFieldArray}
            couponsFieldArray={props.couponsFieldArray}
            serverError={props.serverError}
            TransactionItemSelect={() => (media.xs ? null : itemSelect)}
            TransactionCouponList={() => (
              <CouponList
                onItemPress={props.couponList.onItemPress}
                onRetryButtonPress={props.couponList.onRetryButtonPress}
                variant={props.couponList.variant}
              />
            )}
          />
        </YStack>
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
