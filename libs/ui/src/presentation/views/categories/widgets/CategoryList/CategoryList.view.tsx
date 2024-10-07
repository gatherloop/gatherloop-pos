import { YStack } from 'tamagui';
import { CategoryListItem, CategoryListItemProps } from '../../components';
import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';

export type CategoryListViewProps = {
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: CategoryListItemProps[] };
};

export const CategoryListView = ({
  onRetryButtonPress,
  variant,
}: CategoryListViewProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Categorys..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Category is Empty"
            subtitle="Please create a new product"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => <CategoryListItem {...item} />}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Categorys"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
