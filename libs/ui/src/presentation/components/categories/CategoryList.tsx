import { YStack } from 'tamagui';
import { CategoryListItem } from './CategoryListItem';
import { EmptyView, ErrorView, LoadingView } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Category } from '../../../domain';

export type CategoryListProps = {
  onRetryButtonPress: () => void;
  onDeleteMenuPress: (category: Category) => void;
  onEditMenuPress: (category: Category) => void;
  onItemPress: (category: Category) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; categories: Category[] };
};

export const CategoryList = ({
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  variant,
}: CategoryListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Categories..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Category is Empty"
            subtitle="Please create a new category"
          />
        ))
        .with({ type: 'loaded' }, ({ categories }) => (
          <FlatList
            nestedScrollEnabled
            data={categories}
            renderItem={({ item }) => (
              <CategoryListItem
                name={item.name}
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
            title="Failed to Fetch Categories"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
