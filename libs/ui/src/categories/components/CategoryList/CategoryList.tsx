import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useCategoryListState } from './CategoryList.state';

import { FlatList } from 'react-native';
import { CategoryListItem } from '../CategoryListItem';

export const CategoryList = () => {
  const { categories, refetch, status, onDeleteMenuPress, onEditMenuPress } =
    useCategoryListState();
  return status === 'pending' ? (
    <LoadingView title="Fetching Categories..." />
  ) : status === 'success' ? (
    categories.length > 0 ? (
      <FlatList
        nestedScrollEnabled
        data={categories}
        renderItem={({ item: category }) => (
          <CategoryListItem
            name={category.name}
            onDeleteMenuPress={() => onDeleteMenuPress(category)}
            onEditMenuPress={() => onEditMenuPress(category)}
            onPress={() => onEditMenuPress(category)}
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
