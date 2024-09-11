import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { YStack } from 'tamagui';
import { useCategoryListState } from './CategoryList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category } from '../../../../../api-contract/src';
import { FlatList } from 'react-native';

export type CategoryListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (category: Category) => void;
    isShown?: (category: Category) => void;
  })[];
  onItemPress: (category: Category) => void;
};

export const CategoryList = ({ itemMenus, onItemPress }: CategoryListProps) => {
  const { categories, refetch, status } = useCategoryListState();
  return status === 'pending' ? (
    <LoadingView title="Fetching Categories..." />
  ) : status === 'success' ? (
    categories.length > 0 ? (
      <FlatList
        nestedScrollEnabled
        data={categories}
        renderItem={({ item: category }) => (
          <ListItem
            title={category.name}
            thumbnailSrc="https://placehold.jp/120x120.png"
            onPress={() => onItemPress(category)}
            menus={itemMenus.map((itemMenu) => ({
              ...itemMenu,
              onPress: () => itemMenu.onPress(category),
              isShown: () =>
                itemMenu.isShown ? itemMenu.isShown(category) : true,
            }))}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        ItemSeparatorComponent={() => <YStack height="$1" />}
      />
    ) : (
      <EmptyView
        title="Oops, Category is Empty"
        subtitle="Please create a new category"
      />
    )
  ) : (
    <ErrorView
      title="Failed to Fetch Categories"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={refetch}
    />
  );
};
