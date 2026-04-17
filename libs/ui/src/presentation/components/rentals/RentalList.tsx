import { EmptyView, ErrorView, Pagination, SkeletonList } from '../base';
import {
  Button,
  Input,
  Label,
  Paragraph,
  Popover,
  RadioGroup,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { FlatList, TextInput } from 'react-native';
import { RentalListItem } from './RentalListItem';
import { CheckoutStatus, Rental } from '../../../domain';
import { Filter, X } from '@tamagui/lucide-icons';
import { useRef, useState } from 'react';

export type RentalListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  checkoutStatus: CheckoutStatus;
  onCheckoutStatusChange: (checkoutStatus: CheckoutStatus) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  rentals: Rental[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  onRetryButtonPress: () => void;
  onDeleteMenuPress?: (rental: Rental) => void;
  onItemPress?: (rental: Rental) => void;
  onEmptyActionPress?: () => void;
  isSearchAutoFocus?: boolean;
  isRevalidating?: boolean;
  isChangingParams?: boolean;
};

export const RentalList = ({
  searchValue,
  onSearchValueChange,
  checkoutStatus,
  onCheckoutStatusChange,
  variant,
  rentals,
  itemPerPage,
  onPageChange,
  currentPage,
  totalItem,
  onRetryButtonPress,
  onDeleteMenuPress,
  onItemPress,
  onEmptyActionPress,
  isSearchAutoFocus,
  isRevalidating,
  isChangingParams,
}: RentalListProps) => {
  const textInputRef = useRef<TextInput>(null);
  const [inputHasText, setInputHasText] = useState(false);
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" alignItems="center" $xs={{ flexDirection: 'column' }}>
        <XStack gap="$3" flex={1} alignItems="center">
          <Input
            id="search"
            placeholder="Search Rental by Code"
            ref={textInputRef}
            onChangeText={(value) => {
              setInputHasText(value.length > 0);
              onSearchValueChange(value);
            }}
            onSubmitEditing={(event) => {
              event.preventDefault();
              textInputRef.current?.clear?.();
              setInputHasText(false);
              setTimeout(() => {
                textInputRef.current?.focus?.();
              }, 100);
            }}
            autoFocus={isSearchAutoFocus}
            flex={1}
          />
          {inputHasText && (
            <Button
              icon={X}
              onPress={() => {
                textInputRef.current?.clear?.();
                setInputHasText(false);
                onSearchValueChange('');
              }}
              circular
              size="$2"
              accessibilityLabel="Clear search"
            />
          )}
        </XStack>

        <Popover size="$5" allowFlip stayInFrame offset={15}>
          <Popover.Trigger asChild>
            <Button icon={Filter}>Filter</Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            width={300}
            height={200}
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            elevate
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

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
          </Popover.Content>
        </Popover>

        {(isRevalidating || isChangingParams) && (
          <Spinner size="small" color="$gray10" testID="search-spinner" />
        )}
      </XStack>
      {variant.type === 'loading' ? (
        <SkeletonList />
      ) : variant.type === 'loaded' ? (
        rentals.length > 0 ? (
          <>
            <FlatList
              data={rentals}
              renderItem={({ item }) => (
                <RentalListItem
                  checkinAt={item.checkinAt}
                  checkoutAt={item.checkoutAt ?? undefined}
                  variantName={item.variant.name}
                  code={item.code}
                  name={item.name}
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
            title="Oops, Rental is Empty"
            subtitle="Please checkin a new rental"
            actionLabel="Checkin Rental"
            onActionPress={onEmptyActionPress}
          />
        )
      ) : variant.type === 'error' ? (
        <ErrorView
          title="Failed to Fetch Rentals"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      ) : null}
    </YStack>
  );
};
