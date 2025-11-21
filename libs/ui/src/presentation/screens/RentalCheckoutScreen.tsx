import { ScrollView } from 'tamagui';
import { RentalCheckoutFormView, Layout, RentalList } from '../components';
import {
  useAuthLogoutController,
  useRentalCheckoutController,
  useRentalListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Rental,
  RentalCheckoutUsecase,
  RentalListUsecase,
} from '../../domain';

export type RentalCheckoutScreenProps = {
  rentalCheckoutUsecase: RentalCheckoutUsecase;
  rentalListUsecase: RentalListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const RentalCheckoutScreen = (props: RentalCheckoutScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const rentalCheckoutController = useRentalCheckoutController(
    props.rentalCheckoutUsecase
  );

  const rentalListController = useRentalListController(props.rentalListUsecase);

  const router = useRouter();

  useEffect(() => {
    if (rentalListController.checkoutStatus !== 'ongoing') {
      rentalListController.onCheckoutStatusChange('ongoing');
    }
  }, [rentalListController]);

  useEffect(() => {
    if (rentalCheckoutController.state.type === 'submitSuccess') {
      router.push(
        `/transactions/${rentalCheckoutController.state.transactionId}`
      );
    }
  }, [
    rentalCheckoutController.state.transactionId,
    rentalCheckoutController.state.type,
    router,
  ]);

  useEffect(() => {
    if (rentalListController.state.type !== 'loaded') return;
    const searchCode = rentalListController.state.query;
    if (
      rentalCheckoutController.state.values.rentals.some(
        ({ code }) => code === searchCode
      )
    )
      return;

    const rental = rentalListController.state.rentals.find(
      ({ code }) => code === searchCode
    );

    if (rental) {
      rentalCheckoutController.onAddItem(rental);
      rentalListController.onSearchValueChange('');
    }
  }, [rentalCheckoutController, rentalListController]);

  const onItemPress = (rental: Rental) => {
    rentalCheckoutController.onAddItem(rental);
    rentalListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Checkout Rental" showBackButton>
      <ScrollView>
        <RentalCheckoutFormView
          {...rentalCheckoutController}
          RentalItemSelect={() => (
            <RentalList
              onItemPress={onItemPress}
              isSearchAutoFocus
              {...rentalListController}
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
