import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { Card, Input, Paragraph, RadioGroup, XStack, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { ReservationListItem } from './ReservationListItem';
import { CheckoutStatus, Reservation } from '../../../domain';
import { Label } from 'tamagui';

export type ReservationListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  checkoutStatus: CheckoutStatus;
  onCheckoutStatusChange: (checkoutStatus: CheckoutStatus) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  reservations: Reservation[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  onRetryButtonPress: () => void;
  onDeleteMenuPress?: (reservation: Reservation) => void;
  onItemPress?: (reservation: Reservation) => void;
};

export const ReservationList = ({
  searchValue,
  onSearchValueChange,
  checkoutStatus,
  onCheckoutStatusChange,
  variant,
  reservations,
  itemPerPage,
  onPageChange,
  currentPage,
  totalItem,
  onRetryButtonPress,
  onDeleteMenuPress,
  onItemPress,
}: ReservationListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
        <Card flex={1} justifyContent="center" padded>
          <YStack justifyContent="center">
            <Label htmlFor="search">Code</Label>
            <Input
              id="search"
              placeholder="Search Reservation by Code"
              value={searchValue}
              onChangeText={onSearchValueChange}
              flex={1}
            />
          </YStack>
        </Card>

        <Card justifyContent="center" padded>
          <YStack>
            <Paragraph>Checkout Status</Paragraph>
            <RadioGroup
              value={checkoutStatus}
              onValueChange={(value) =>
                onCheckoutStatusChange(value as CheckoutStatus)
              }
              gap="$2"
            >
              <XStack gap="$3">
                <XStack gap="$2" alignItems="center">
                  <RadioGroup.Item value="all" id="all-checkout-status">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label htmlFor="all-checkout-status">All</Label>
                </XStack>

                <XStack gap="$2" alignItems="center">
                  <RadioGroup.Item value="ongoing" id="ongoing">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label htmlFor="ongoing">Ongoing</Label>
                </XStack>

                <XStack gap="$2" alignItems="center">
                  <RadioGroup.Item value="completed" id="completed">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label htmlFor="completed">Completed</Label>
                </XStack>
              </XStack>
            </RadioGroup>
          </YStack>
        </Card>
      </XStack>
      {variant.type === 'loading' ? (
        <LoadingView title="Fetching Reservations..." />
      ) : variant.type === 'loaded' ? (
        reservations.length > 0 ? (
          <>
            <FlatList
              data={reservations}
              renderItem={({ item }) => (
                <ReservationListItem
                  checkinAt={item.checkinAt}
                  checkoutAt={item.checkoutAt ?? undefined}
                  variantName={item.variant.name}
                  code={item.code}
                  onDeleteMenuPress={
                    onDeleteMenuPress
                      ? () => onDeleteMenuPress(item)
                      : undefined
                  }
                  onItemPress={
                    onItemPress ? () => onItemPress(item) : undefined
                  }
                />
              )}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={currentPage}
              onChangePage={onPageChange}
              totalItem={totalItem}
              itemPerPage={itemPerPage}
            />
          </>
        ) : (
          <EmptyView
            title="Oops, Reservation is Empty"
            subtitle="Please checkin a new reservation"
          />
        )
      ) : variant.type === 'error' ? (
        <ErrorView
          title="Failed to Fetch Reservations"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      ) : null}
    </YStack>
  );
};
