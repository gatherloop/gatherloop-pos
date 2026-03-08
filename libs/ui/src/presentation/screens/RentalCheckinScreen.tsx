import { ScrollView } from 'tamagui';
import {
  RentalCheckinFormView,
  Layout,
  TransactionItemSelect,
  TransactionItemSelectProps,
} from '../components';
import { OptionValue, Product, RentalCheckinForm } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';

export type RentalCheckinScreenProps = {
  form: UseFormReturn<RentalCheckinForm>;
  onSubmit: (values: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  onLogoutPress: () => void;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckinForm, 'rentals', 'key'>;
  onToggleCustomizeCheckinDateTime: (checked: boolean) => void;
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
};

export const RentalCheckinScreen = (props: RentalCheckinScreenProps) => {
  return (
    <Layout
      title="Checkin Rental"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <RentalCheckinFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          rentalsFieldArray={props.rentalsFieldArray}
          onToggleCustomizeCheckinDateTime={
            props.onToggleCustomizeCheckinDateTime
          }
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
      </ScrollView>
    </Layout>
  );
};
