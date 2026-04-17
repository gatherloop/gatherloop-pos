import { Button, XStack } from 'tamagui';
import { Layout, RentalList, RentalDeleteAlert } from '../components';
import { Link } from 'solito/link';
import { Check, Plus } from '@tamagui/lucide-icons';
import { CheckoutStatus, Rental } from '../../domain';

export type RentalListScreenProps = {
  onLogoutPress: () => void;
  onDeleteMenuPress: (rental: Rental) => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  rentals: Rental[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  checkoutStatus: CheckoutStatus;
  onCheckoutStatusChange: (checkoutStatus: CheckoutStatus) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  isRevalidating?: boolean;
};

export const RentalListScreen = ({
  onLogoutPress,
  onDeleteMenuPress,
  onRetryButtonPress,
  variant,
  rentals,
  searchValue,
  onSearchValueChange,
  checkoutStatus,
  onCheckoutStatusChange,
  currentPage,
  onPageChange,
  totalItem,
  itemPerPage,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteConfirm,
  isRevalidating,
}: RentalListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
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
        variant={variant}
        rentals={rentals}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        checkoutStatus={checkoutStatus}
        onCheckoutStatusChange={onCheckoutStatusChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        onRetryButtonPress={onRetryButtonPress}
        onDeleteMenuPress={onDeleteMenuPress}
        isRevalidating={isRevalidating}
      />
      <RentalDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onButtonConfirmPress={onDeleteConfirm}
      />
    </Layout>
  );
};
