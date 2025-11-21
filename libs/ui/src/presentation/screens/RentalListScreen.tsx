import { Button, XStack } from 'tamagui';
import { Layout, RentalList, RentalDeleteAlert } from '../components';
import { Link } from 'solito/link';
import { Check, Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useRentalDeleteController,
  useRentalListController,
} from '../controllers';
import { useEffect } from 'react';
import {
  AuthLogoutUsecase,
  Rental,
  RentalDeleteUsecase,
  RentalListUsecase,
} from '../../domain';

export type RentalListScreenProps = {
  rentalListUsecase: RentalListUsecase;
  rentalDeleteUsecase: RentalDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const RentalListScreen = (props: RentalListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const rentalListController = useRentalListController(props.rentalListUsecase);
  const rentalDeleteController = useRentalDeleteController(
    props.rentalDeleteUsecase
  );

  useEffect(() => {
    if (rentalDeleteController.state.type === 'deletingSuccess') {
      rentalListController.dispatch({ type: 'FETCH' });
    }
  }, [rentalDeleteController.state.type, rentalListController]);

  const onDeleteMenuPress = (rental: Rental) => {
    rentalDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      rentalId: rental.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Rentals"
      rightActionItem={
        <XStack gap="$3">
          <Link href="/rentals/checkin">
            <Button size="$3" icon={Plus} variant="outlined" disabled>
              Checkin
            </Button>
          </Link>
          <Link href="/rentals/checkout">
            <Button size="$3" icon={Check} variant="outlined" disabled>
              Checkout
            </Button>
          </Link>
        </XStack>
      }
    >
      <RentalList
        {...rentalListController}
        onDeleteMenuPress={onDeleteMenuPress}
      />
      <RentalDeleteAlert {...rentalDeleteController} />
    </Layout>
  );
};
