import { ScrollView } from 'tamagui';
import { RentalCheckoutFormView, Layout, RentalList } from '../components';
import { RentalCheckoutForm, Rental, CheckoutStatus } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { RentalListProps } from '../components';

export type RentalCheckoutScreenProps = {
  form: UseFormReturn<RentalCheckoutForm>;
  onSubmit: (values: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckoutForm, 'rentals', 'key'>;
  rentalList: {
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    checkoutStatus: CheckoutStatus;
    onCheckoutStatusChange: (checkoutStatus: CheckoutStatus) => void;
    variant: RentalListProps['variant'];
    rentals: Rental[];
    currentPage: number;
    onPageChange: (page: number) => void;
    totalItem: number;
    itemPerPage: number;
    onRetryButtonPress: () => void;
    onItemPress: (rental: Rental) => void;
    isSearchAutoFocus: boolean;
  };
};

export const RentalCheckoutScreen = (props: RentalCheckoutScreenProps) => {
  return (
    <Layout
      onLogoutPress={props.onLogoutPress}
      title="Checkout Rental"
      showBackButton
    >
      <ScrollView>
        <RentalCheckoutFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          rentalsFieldArray={props.rentalsFieldArray}
          RentalItemSelect={() => <RentalList {...props.rentalList} />}
        />
      </ScrollView>
    </Layout>
  );
};
