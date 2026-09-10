import { ReactNode } from 'react';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { Category } from '../../../../domain/entities/Category';
import { Product } from '../../../../domain/entities/Product';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { Focusable } from '../../components/base/Focusable';
import { SkeletonList } from '../../components/base/SkeletonView';
import { CategoryChipList } from '../../components/menu/CategoryChipList';
import { MenuProductCard } from '../../components/menu/MenuProductCard';
import {
  MenuItemDetailScreen,
  MenuItemDetailScreenProps,
} from './MenuItemDetailScreen';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type MenuListScreenGroup = { category: Category; products: Product[] };

export type MenuListScreenVariant =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'empty' }
  | { type: 'loaded'; groups: MenuListScreenGroup[] };

export type MenuListScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  footer?: ReactNode;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  isSearching?: boolean;
  chipCategories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  variant: MenuListScreenVariant;
  onRetryButtonPress: () => void;
  onItemPress: (product: Product) => void;
  startingPriceByProductId: Record<number, number>;
  itemDetail: (MenuItemDetailScreenProps & { isOpen: true }) | null;
};

export const MenuListScreen = ({
  tableVariant,
  footer,
  searchValue,
  onSearchValueChange,
  isSearching,
  chipCategories,
  selectedCategoryId,
  onSelectCategory,
  variant,
  onRetryButtonPress,
  onItemPress,
  startingPriceByProductId,
  itemDetail,
}: MenuListScreenProps) => {
  return (
    <TableResolveScreen variant={tableVariant} footer={footer}>
      <YStack gap="$3" flex={1}>
        <YStack
          gap="$2"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          position="sticky"
          top={0}
          zIndex={11}
          backgroundColor="$background"
          paddingBottom="$2"
        >
          <XStack gap="$2" alignItems="center">
            <Input
              flex={1}
              placeholder="Cari menu"
              value={searchValue}
              onChangeText={onSearchValueChange}
              accessibilityLabel="Cari menu"
            />
            {isSearching && <Spinner size="small" testID="search-spinner" />}
          </XStack>

          {chipCategories.length > 0 && (
            <CategoryChipList
              categories={chipCategories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
            />
          )}
        </YStack>

        {match(variant)
          .with({ type: 'loading' }, () => <SkeletonList />)
          .with({ type: 'empty' }, () => (
            <EmptyView
              title="Menu tidak ditemukan"
              subtitle="Coba kata kunci lain atau pilih kategori yang berbeda."
            />
          ))
          .with({ type: 'error' }, () => (
            <ErrorView
              title="Gagal memuat menu"
              subtitle="Terjadi kesalahan. Silakan coba lagi."
              onRetryButtonPress={onRetryButtonPress}
            />
          ))
          .with({ type: 'loaded' }, ({ groups }) => (
            <YStack gap="$5">
              {groups.map(({ category, products }) => (
                <YStack key={category.id} gap="$3">
                  <Text fontSize="$6" fontWeight="bold">
                    {category.name}
                  </Text>
                  <YStack gap="$3">
                    {products.map((product) => (
                      <Focusable
                        key={product.id}
                        onEnterPress={() => onItemPress(product)}
                      >
                        <MenuProductCard
                          product={product}
                          startingPrice={
                            startingPriceByProductId[product.id] ?? null
                          }
                          onPress={() => onItemPress(product)}
                        />
                      </Focusable>
                    ))}
                  </YStack>
                </YStack>
              ))}
            </YStack>
          ))
          .exhaustive()}
      </YStack>

      {itemDetail && <MenuItemDetailScreen {...itemDetail} />}
    </TableResolveScreen>
  );
};
