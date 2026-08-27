import { MutableRefObject } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ScrollView, YStack } from 'tamagui';
import {
  RentalCheckinFormView,
  Layout,
  TransactionItemSelect,
  TransactionItemSelectProps,
  useIsCompactLayout,
} from '../components';
import { FormVariant } from '../components/base';
import { OptionValue, Product, RentalCheckinForm, Ticket } from '../../domain';

export type RentalCheckinScreenProps = {
  variant: FormVariant;
  defaultValues: RentalCheckinForm;
  onSubmit: (values: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  onLogoutPress: () => void;
  /**
   * Escape hatch so `RentalCheckinHandler` can push an item picked in the
   * sibling `transactionItemSelect` controller into the form. Null until
   * the form's `loaded` branch mounts.
   */
  formRef?: MutableRefObject<UseFormReturn<RentalCheckinForm> | null>;
  tickets: Ticket[];
  rentalItemSelect: {
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
  serverError?: string;
};

export const RentalCheckinScreen = (props: RentalCheckinScreenProps) => {
  const isCompactLayout = useIsCompactLayout();

  const formView = (
    <RentalCheckinFormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      onSubmit={props.onSubmit}
      isSubmitDisabled={props.isSubmitDisabled}
      isSubmitting={props.isSubmitting}
      isSubmitSuccess={props.isSubmitSuccess}
      formRef={props.formRef}
      tickets={props.tickets}
      serverError={props.serverError}
      RentalItemSelect={() => (
        <TransactionItemSelect
          amount={props.rentalItemSelect.amount}
          currentPage={props.rentalItemSelect.currentPage}
          itemPerPage={props.rentalItemSelect.itemPerPage}
          onAmountChange={props.rentalItemSelect.onAmountChange}
          onOptionValuesChange={props.rentalItemSelect.onOptionValuesChange}
          onPageChange={props.rentalItemSelect.onPageChange}
          onRetryButtonPress={props.rentalItemSelect.onRetryButtonPress}
          onSearchValueChange={props.rentalItemSelect.onSearchValueChange}
          onSelectProduct={props.rentalItemSelect.onSelectProduct}
          onSubmit={props.rentalItemSelect.onSubmit}
          onUnselectProduct={props.rentalItemSelect.onUnselectProduct}
          products={props.rentalItemSelect.products}
          searchValue={props.rentalItemSelect.searchValue}
          selectedOptionValues={props.rentalItemSelect.selectedOptionValues}
          totalItem={props.rentalItemSelect.totalItem}
          variant={props.rentalItemSelect.variant}
          selectedProduct={props.rentalItemSelect.selectedProduct}
        />
      )}
    />
  );

  return (
    <Layout
      title="Checkin Rental"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      {isCompactLayout ? (
        // On compact, the product picker owns a bounded `flex: 1` region and
        // scrolls internally — an outer `ScrollView` here would give it no
        // height to bound against (PRD FR-3).
        <YStack flex={1}>{formView}</YStack>
      ) : (
        <ScrollView>{formView}</ScrollView>
      )}
    </Layout>
  );
};
