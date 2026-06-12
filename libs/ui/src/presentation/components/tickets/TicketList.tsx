import { Spinner, YStack } from 'tamagui';
import { TicketListItem } from './TicketListItem';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Ticket } from '../../../domain';

export type TicketListProps = {
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  onDeleteMenuPress?: (ticket: Ticket) => void;
  onEditMenuPress?: (ticket: Ticket) => void;
  onItemPress: (ticket: Ticket) => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; tickets: Ticket[] };
};

export const TicketList = ({
  onRetryButtonPress,
  onEmptyActionPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  isRevalidating,
  variant,
}: TicketListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Ticket is Empty"
            subtitle="Please create a new ticket"
            actionLabel="Create Ticket"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ tickets }) => (
          <FlatList
            nestedScrollEnabled
            data={tickets}
            renderItem={({ item }) => (
              <TicketListItem
                code={item.code}
                name={item.name}
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
            title="Failed to Fetch Tickets"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
