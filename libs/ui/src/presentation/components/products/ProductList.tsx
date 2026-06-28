import {
  Button,
  Input,
  Label,
  Paragraph,
  Popover,
  RadioGroup,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { ProductListItem } from './ProductListItem';
import {
  EmptyView,
  ErrorView,
  Focusable,
  Pagination,
  SkeletonList,
} from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Product, SaleType, StatusFilter } from '../../../domain';
import { Filter, X } from '@tamagui/lucide-icons';

export type ProductListProps = {
  searchValue: string;
  saleType: SaleType;
  status: StatusFilter;
  onSearchValueChange: (value: string) => void;
  onSearchClear?: () => void;
  onSaleTypeChange: (value: SaleType) => void;
  onStatusChange: (value: StatusFilter) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onEditMenuPress?: (product: Product) => void;
  onDeleteMenuPress?: (product: Product) => void;
  onItemPress: (product: Product) => void;
  onEmptyActionPress?: () => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  isRevalidating?: boolean;
  isChangingParams?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Product[] };
  numColumns?: number;
};

export const ProductList = ({
  onPageChange,
  onRetryButtonPress,
  onSearchValueChange,
  onSearchClear,
  onSaleTypeChange,
  onStatusChange,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  searchValue,
  saleType,
  status,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  isRevalidating,
  isChangingParams,
  variant,
  numColumns = 1,
  onEmptyActionPress,
}: ProductListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" justifyContent="space-between" alignItems="center">
        <Input
          placeholder="Search Products by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
          flex={1}
        />
        {searchValue.length > 0 && (
          <Button
            icon={X}
            onPress={onSearchClear}
            circular
            size="$2"
            accessibilityLabel="Clear search"
          />
        )}

        <Popover size="$5" allowFlip stayInFrame offset={15}>
          <Popover.Trigger asChild>
            <Button icon={Filter}>Filter</Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            width={300}
            height={280}
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            elevate
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

            <YStack gap="$3">
              <YStack>
                <Paragraph>Sale Type</Paragraph>
                <RadioGroup
                  value={saleType}
                  onValueChange={(value) => onSaleTypeChange(value as SaleType)}
                  gap="$2"
                >
                  <XStack gap="$3">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-sale-type">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="all-sale-type">All</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="purchase" id="purchase">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="purchase">Purchase</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="rental" id="rental">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="rental">Rental</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
              </YStack>

              <YStack>
                <Paragraph>Status</Paragraph>
                <RadioGroup
                  value={status}
                  onValueChange={(value) =>
                    onStatusChange(value as StatusFilter)
                  }
                  gap="$2"
                >
                  <XStack gap="$3">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-status">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="all-status">All</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="draft" id="draft">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="draft">Draft</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="published" id="published">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="published">Published</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>

        {(isRevalidating || isChangingParams) && (
          <Spinner size="small" color="$gray10" testID="search-spinner" />
        )}
      </XStack>

      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Product is Empty"
            subtitle="Please create a new product"
            actionLabel="Create Product"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            numColumns={numColumns}
            contentContainerStyle={{ gap: 16 }}
            columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
            renderItem={({ item }) => (
              <Focusable
                onEnterPress={() => onItemPress(item)}
                style={{ flex: 1 }}
              >
                <ProductListItem
                  categoryName={item.category.name}
                  saleType={item.saleType}
                  status={item.status}
                  style={{ flex: 1 }}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  onDeleteMenuPress={
                    onDeleteMenuPress
                      ? () => onDeleteMenuPress(item)
                      : onDeleteMenuPress
                  }
                  onEditMenuPress={
                    onEditMenuPress
                      ? () => onEditMenuPress(item)
                      : onEditMenuPress
                  }
                  onPress={() => onItemPress(item)}
                />
              </Focusable>
            )}
            ItemSeparatorComponent={() => (
              <YStack height="$1" style={{ flex: 1 }} />
            )}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Products"
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
