import { Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar — dead weight
// the customer bundle does not ship (D6).
import { Category } from '../../domain/entities/Category';
import { Product } from '../../domain/entities/Product';
import { EmptyView } from '../components/base/EmptyView';
import { ErrorView } from '../components/base/ErrorView';
import { Focusable } from '../components/base/Focusable';
import { SkeletonList } from '../components/base/SkeletonView';
import { CategoryChipList } from '../components/menu/CategoryChipList';
import { MenuProductCard } from '../components/menu/MenuProductCard';

export type MenuListScreenGroup = { category: Category; products: Product[] };

export type MenuListScreenVariant =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'empty' }
  | { type: 'loaded'; groups: MenuListScreenGroup[] };

export type MenuListScreenProps = {
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
};

// FR-5 in docs/prd-table-ordering.md. No SSR (D18) — the parent handler
// starts in `idle`, so `loading` is the first thing a guest ever sees here.
// `chipCategories`/`selectedCategoryId` drive client-side grouping only
// (D4) — there is no `categoryId` filter on the underlying fetch.
export const MenuListScreen = ({
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
}: MenuListScreenProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack
        gap="$2"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - Tamagui's type doesn't include CSS `sticky`,
        // but it passes through to the underlying web style (see
        // StockCheckFormView.tsx for the same pattern). Search field and
        // category chips stick together as one unit — sticking each
        // independently at `top: 0` would stack them on top of each other
        // instead of one below the other.
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
  );
};
