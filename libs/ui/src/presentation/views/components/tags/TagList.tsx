import { Spinner, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { Tag } from '../../../../domain';
import { TagListItem } from './TagListItem';

export type TagListProps = {
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  onDeleteMenuPress: (tag: Tag) => void;
  onEditMenuPress: (tag: Tag) => void;
  onAssignMenuPress: (tag: Tag) => void;
  onItemPress: (tag: Tag) => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; tags: Tag[] };
};

export const TagList = ({
  onRetryButtonPress,
  onEmptyActionPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onAssignMenuPress,
  onItemPress,
  isRevalidating,
  variant,
}: TagListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Tag is Empty"
            subtitle="Please create a new tag"
            actionLabel="Create Tag"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ tags }) => (
          <FlatList
            nestedScrollEnabled
            data={tags}
            renderItem={({ item }) => (
              <TagListItem
                name={item.name}
                color={item.color}
                isHighlighted={item.isHighlighted}
                variantCount={item.variantCount}
                onDeleteMenuPress={() => onDeleteMenuPress(item)}
                onEditMenuPress={() => onEditMenuPress(item)}
                onAssignMenuPress={() => onAssignMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Tags"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .exhaustive()}
    </YStack>
  );
};
