import { Spinner, YStack } from 'tamagui';
import { StockCheckListItem } from './StockCheckListItem';
import { EmptyView, ErrorView, Pagination, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { StockCheck } from '../../../domain';

export type StockCheckListProps = {
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  onPageChange: (page: number) => void;
  onViewMenuPress?: (stockCheck: StockCheck) => void;
  onEditMenuPress?: (stockCheck: StockCheck) => void;
  onDeleteMenuPress?: (stockCheck: StockCheck) => void;
  onViewPurchaseListMenuPress?: (stockCheck: StockCheck) => void;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: StockCheck[] };
};

export const StockCheckList = ({
  onPageChange,
  onRetryButtonPress,
  onEmptyActionPress,
  onViewMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onViewPurchaseListMenuPress,
  totalItem,
  currentPage,
  itemPerPage,
  isRevalidating,
  variant,
}: StockCheckListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && (
        <YStack alignItems="center">
          <Spinner size="small" color="$gray10" />
        </YStack>
      )}

      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="No Stock Checks Yet"
            subtitle="Create a new stock check to get started"
            actionLabel="Create Stock Check"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <StockCheckListItem
                stockCheck={item}
                onViewMenuPress={
                  onViewMenuPress ? () => onViewMenuPress(item) : undefined
                }
                onEditMenuPress={
                  onEditMenuPress ? () => onEditMenuPress(item) : undefined
                }
                onDeleteMenuPress={
                  onDeleteMenuPress ? () => onDeleteMenuPress(item) : undefined
                }
                onViewPurchaseListMenuPress={
                  onViewPurchaseListMenuPress
                    ? () => onViewPurchaseListMenuPress(item)
                    : undefined
                }
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Stock Checks"
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
