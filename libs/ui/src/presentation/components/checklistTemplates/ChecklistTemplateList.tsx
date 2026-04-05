import { Input, YStack } from 'tamagui';
import { ChecklistTemplateListItem } from './ChecklistTemplateListItem';
import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { ChecklistTemplate } from '../../../domain';

export type ChecklistTemplateListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onEditMenuPress?: (checklistTemplate: ChecklistTemplate) => void;
  onDeleteMenuPress?: (checklistTemplate: ChecklistTemplate) => void;
  onItemPress: (checklistTemplate: ChecklistTemplate) => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ChecklistTemplate[] };
};

export const ChecklistTemplateList = ({
  onPageChange,
  onRetryButtonPress,
  onSearchValueChange,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  searchValue,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  variant,
}: ChecklistTemplateListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Checklist Templates by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>

      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Checklist Templates..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Checklist Template is Empty"
            subtitle="Please create a new checklist template"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <ChecklistTemplateListItem
                name={item.name}
                description={item.description}
                itemCount={item.items.length}
                onEditMenuPress={
                  onEditMenuPress ? () => onEditMenuPress(item) : undefined
                }
                onDeleteMenuPress={
                  onDeleteMenuPress
                    ? () => onDeleteMenuPress(item)
                    : undefined
                }
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Checklist Templates"
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
