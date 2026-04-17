import { Select, Spinner, XStack, YStack } from 'tamagui';
import { EmptyView, ErrorView, ListItem, Pagination, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { CheckCircle, Clock, Filter } from '@tamagui/lucide-icons';
import { ChecklistSession, ChecklistSessionListFilter } from '../../../domain';

export type ChecklistSessionListProps = {
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onItemPress: (checklistSession: ChecklistSession) => void;
  onFilterChange: (filter: ChecklistSessionListFilter) => void;
  filter: ChecklistSessionListFilter;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ChecklistSession[] };
};

function getCompletedCount(session: ChecklistSession): number {
  return session.items.filter((item) => {
    if (item.subItems.length > 0) {
      return item.subItems.every((sub) => sub.completedAt != null);
    }
    return item.completedAt != null;
  }).length;
}

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

export const ChecklistSessionList = ({
  onPageChange,
  onRetryButtonPress,
  onItemPress,
  onFilterChange,
  filter,
  totalItem,
  currentPage,
  itemPerPage,
  isRevalidating,
  variant,
}: ChecklistSessionListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <Filter size="$1" color="$gray10" />
        <Select
          value={filter.status ?? ''}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              status:
                value === ''
                  ? null
                  : (value as 'completed' | 'incomplete'),
            })
          }
        >
          <Select.Trigger width={160}>
            <Select.Value placeholder="All statuses" />
          </Select.Trigger>
          <Select.Content>
            <Select.ScrollUpButton />
            <Select.Viewport>
              <Select.Item index={0} value="">
                <Select.ItemText>All Statuses</Select.ItemText>
              </Select.Item>
              <Select.Item index={1} value="completed">
                <Select.ItemText>Completed</Select.ItemText>
              </Select.Item>
              <Select.Item index={2} value="incomplete">
                <Select.ItemText>Incomplete</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
            <Select.ScrollDownButton />
          </Select.Content>
        </Select>
        {isRevalidating && <Spinner size="small" color="$gray10" marginLeft="auto" />}
      </XStack>

      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Checklist Sessions is Empty"
            subtitle="Please create a new checklist session"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const completed = getCompletedCount(item);
              const total = item.items.length;
              const isCompleted = item.completedAt != null;
              return (
                <ListItem
                  title={item.checklistTemplate?.name ?? `Session #${item.id}`}
                  subtitle={formatDate(item.date)}
                  onPress={() => onItemPress(item)}
                  pressStyle={{ opacity: 0.7 }}
                  footerItems={[
                    {
                      value: `${completed}/${total} completed`,
                    },
                    {
                      icon: isCompleted ? CheckCircle : Clock,
                      value: isCompleted ? 'Done' : 'Pending',
                    },
                  ]}
                />
              );
            }}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Checklist Sessions"
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
