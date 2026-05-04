import { Button, Input, Spinner, XStack, YStack } from 'tamagui';
import { MaterialListItem } from './MaterialListItem';
import { EmptyView, ErrorView, Pagination, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Material } from '../../../domain';
import { X } from '@tamagui/lucide-icons';

export type MaterialListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearchClear?: () => void;
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
