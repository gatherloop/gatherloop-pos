import { MutableRefObject } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ScrollView, YStack } from 'tamagui';
import {
  RentalCheckoutFormView,
  Layout,
  RentalList,
  useIsCompactLayout,
} from '../components';
import { FormVariant } from '../components/base';
import { RentalCheckoutForm, Rental, CheckoutStatus } from '../../domain';
import { RentalListProps } from '../components';

export type RentalCheckoutScreenProps = {
  variant: FormVariant;
  defaultValues: RentalCheckoutForm;
  onSubmit: (values: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  onLogoutPress: () => void;
  formRef?: MutableRefObject<UseFormReturn<RentalCheckoutForm> | null>;
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
  serverError?: string;
};

export const RentalCheckoutScreen = (props: RentalCheckoutScreenProps) => {
  const isCompactLayout = useIsCompactLayout();

  const formView = (
    <RentalCheckoutFormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      onSubmit={props.onSubmit}
      isSubmitDisabled={props.isSubmitDisabled}
      isSubmitting={props.isSubmitting}
      isSubmitSuccess={props.isSubmitSuccess}
      formRef={props.formRef}
      RentalItemSelect={(selectedRentalIds) => (
        <RentalList
          {...props.rentalList}
          // On desktop the field is a scanner target; on a phone it would
          // raise the keyboard over the list on arrival (PRD FR-2).
          isSearchAutoFocus={
            props.rentalList.isSearchAutoFocus && !isCompactLayout
          }
          // Surfaces an "In Cart" affordance on rows already added, since
          // `onAddItem` silently no-ops a duplicate tap (PRD FR-4).
          selectedRentalIds={selectedRentalIds}
        />
      )}
      serverError={props.serverError}
    />
  );

  return (
    <Layout
      onLogoutPress={props.onLogoutPress}
      title="Checkout Rental"
      showBackButton
    >
      {isCompactLayout ? (
        // On compact, the rental list owns a bounded `flex: 1` region and
        // scrolls internally — an outer `ScrollView` here would give it no
        // height to bound against (PRD FR-2).
        <YStack flex={1}>{formView}</YStack>
      ) : (
        <ScrollView>{formView}</ScrollView>
      )}
    </Layout>
  );
};
