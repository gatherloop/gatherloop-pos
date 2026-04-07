import { Paragraph, Select, Text, XStack, YStack } from 'tamagui';
import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { CheckCircle, Clock } from '@tamagui/lucide-icons';
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

export const ChecklistSessionList = ({
  onPageChange,
  onRetryButtonPress,
  onItemPress,
  onFilterChange,
  filter,
  totalItem,
  currentPage,
  itemPerPage,
  variant,
}: ChecklistSessionListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {/* Filter Controls */}
      <XStack gap="$2" flexWrap="wrap">
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
      </XStack>

      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Checklist Sessions..." />
        ))
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
                <XStack
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor="$background"
                  borderWidth={1}
                  borderColor="$borderColor"
                  justifyContent="space-between"
                  alignItems="center"
                  onPress={() => onItemPress(item)}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <YStack gap="$1" flex={1}>
                    <Text fontSize="$4" fontWeight="bold">
                      {item.checklistTemplate?.name ?? `Session #${item.id}`}
                    </Text>
                    <Paragraph fontSize="$3" color="$gray10">
                      {item.date}
                    </Paragraph>
                    <Text fontSize="$3" color="$gray10">
                      {completed}/{total} completed
                    </Text>
                  </YStack>
                  <XStack alignItems="center" gap="$2">
                    {isCompleted ? (
                      <CheckCircle size="$2" color="$green10" />
                    ) : (
                      <Clock size="$2" color="$orange10" />
                    )}
                    <Text
                      fontSize="$3"
                      fontWeight="bold"
                      color={isCompleted ? '$green10' : '$orange10'}
                    >
                      {isCompleted ? 'Done' : 'Pending'}
                    </Text>
                  </XStack>
                </XStack>
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
