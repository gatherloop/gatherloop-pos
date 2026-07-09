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
import { MaterialListItem } from './MaterialListItem';
import { EmptyView, ErrorView, Pagination, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Material, MaterialStockCheckStatus } from '../../../domain';
import { Filter, X } from '@tamagui/lucide-icons';

export type MaterialListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearchClear?: () => void;
  stockCheckStatus?: MaterialStockCheckStatus;
  onStockCheckStatusChange?: (status: MaterialStockCheckStatus) => void;
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  onPageChange: (page: number) => void;
  onEditMenuPress?: (material: Material) => void;
  onDeleteMenuPress?: (material: Material) => void;
  onItemPress: (material: Material) => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  isRevalidating?: boolean;
  isChangingParams?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Material[] };
};

export const MaterialList = ({
  onPageChange,
  onRetryButtonPress,
  onEmptyActionPress,
  onSearchValueChange,
  onSearchClear,
  stockCheckStatus,
  onStockCheckStatusChange,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  searchValue,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  isRevalidating,
  isChangingParams,
  variant,
}: MaterialListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack alignItems="center" gap="$2">
        <Input
          placeholder="Search Materials by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
          flex={1}
        />
        {(isRevalidating || isChangingParams) && (
          <Spinner size="small" color="$gray10" testID="search-spinner" />
        )}
        {searchValue.length > 0 && (
          <Button
            icon={X}
            onPress={onSearchClear}
            circular
            size="$2"
            accessibilityLabel="Clear search"
          />
        )}

        {onStockCheckStatusChange && (
          <Popover size="$5" allowFlip stayInFrame offset={15}>
            <Popover.Trigger asChild>
              <Button icon={Filter}>Filter</Button>
            </Popover.Trigger>

            <Popover.Content
              borderWidth={1}
              borderColor="$borderColor"
              width={300}
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
                <Paragraph>Stock Check</Paragraph>
                <RadioGroup
                  value={stockCheckStatus ?? 'all'}
                  onValueChange={(value) =>
                    onStockCheckStatusChange(value as MaterialStockCheckStatus)
                  }
                  gap="$2"
                >
                  <XStack gap="$3">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-stock-check-status">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="all-stock-check-status">All</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="required" id="required">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="required">Required</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="excluded" id="excluded">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="excluded">Excluded</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
              </YStack>
            </Popover.Content>
          </Popover>
        )}
      </XStack>

      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Material is Empty"
            subtitle="Please create a new material"
            actionLabel="Create Material"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <MaterialListItem
                name={item.name}
                price={item.price}
                unit={item.unit}
                weeklyUsage={item.weeklyUsage}
                purchaseUnit={item.purchaseUnit}
                minimumStock={item.minimumStock}
                normalStock={item.normalStock}
                isStockCheckRequired={item.isStockCheckRequired}
                supplierName={item.suppliers[0]?.supplier.name}
                onEditMenuPress={
                  onEditMenuPress ? () => onEditMenuPress(item) : undefined
                }
                onDeleteMenuPress={
                  onDeleteMenuPress ? () => onDeleteMenuPress(item) : undefined
                }
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Materials"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}

      <Pagination
        currentPage={currentPage}
        onChangePage={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
      />
    </YStack>
  );
};
