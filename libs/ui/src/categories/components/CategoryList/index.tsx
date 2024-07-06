import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { XStack } from 'tamagui';
import { useCategoryListState } from './state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category } from '../../../../../api-contract/src';

export type CategoryListProps = {
  onItemPress?: (category: Category) => void;
};

export const CategoryList = ({ onItemPress }: CategoryListProps) => {
  const { categories, refetch, status } = useCategoryListState();
  return (
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Categories..." />
      ) : status === 'success' ? (
        categories.length > 0 ? (
          categories.map((category) => (
            <ListItem
              key={category.id}
              title={category.name}
              subtitle={category.description}
              thumbnailSrc={category.imageUrl}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
              onPress={() => onItemPress && onItemPress(category)}
            />
          ))
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
      )}
    </XStack>
  );
};
