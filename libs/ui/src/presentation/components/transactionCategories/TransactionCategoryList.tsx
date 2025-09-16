import { YStack } from 'tamagui';
import { TransactionCategoryListItem } from './TransactionCategoryListItem';
import { EmptyView, ErrorView, LoadingView } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { TransactionCategory } from '../../../domain';

export type TransactionCategoryListProps = {
  onRetryButtonPress: () => void;
  onDeleteMenuPress: (transactionCategory: TransactionCategory) => void;
  onEditMenuPress: (transactionCategory: TransactionCategory) => void;
  onItemPress: (transactionCategory: TransactionCategory) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; transactionCategories: TransactionCategory[] };
};

export const TransactionCategoryList = ({
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  variant,
}: TransactionCategoryListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Transaction Categories..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Transaction Category is Empty"
            subtitle="Please create a new transaction category"
          />
        ))
        .with({ type: 'loaded' }, ({ transactionCategories }) => (
          <FlatList
            nestedScrollEnabled
            data={transactionCategories}
            renderItem={({ item }) => (
              <TransactionCategoryListItem
                name={item.name}
                type={item.checkoutProduct === null ? 'order' : 'checkout'}
                onDeleteMenuPress={() => onDeleteMenuPress(item)}
                onEditMenuPress={() => onEditMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Transaction Categories"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
