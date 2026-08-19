import { Spinner, YStack } from 'tamagui';
import { TableListItem } from './TableListItem';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Table } from '../../../domain';

export type TableListProps = {
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  onDeleteMenuPress?: (table: Table) => void;
  onEditMenuPress?: (table: Table) => void;
  onItemPress: (table: Table) => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; tables: Table[] };
};

export const TableList = ({
  onRetryButtonPress,
  onEmptyActionPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  isRevalidating,
  variant,
}: TableListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Table is Empty"
            subtitle="Please create a new table"
            actionLabel="Create Table"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ tables }) => (
          <FlatList
            nestedScrollEnabled
            data={tables}
            renderItem={({ item }) => (
              <TableListItem
                code={item.code}
                label={item.label}
                floorNumber={item.floorNumber}
                onDeleteMenuPress={
                  onDeleteMenuPress ? () => onDeleteMenuPress(item) : undefined
                }
                onEditMenuPress={
                  onEditMenuPress ? () => onEditMenuPress(item) : undefined
                }
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Tables"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
