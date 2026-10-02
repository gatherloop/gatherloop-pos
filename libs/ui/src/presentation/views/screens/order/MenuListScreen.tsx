import { ReactNode } from 'react';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { Category } from '../../../../domain/entities/Category';
import { Product } from '../../../../domain/entities/Product';
import { Tag } from '../../../../domain/entities/Tag';
import {
  TagHighlight,
  TagHighlightEntry,
} from '../../../../utils/buildTagHighlights';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { Focusable } from '../../components/base/Focusable';
import { SkeletonList } from '../../components/base/SkeletonView';
import {
  PaymentCancelAlert,
  PaymentCancelAlertProps,
} from '../../components/checkout/PaymentCancelAlert';
import { CategoryChipList } from '../../components/menu/CategoryChipList';
import { MenuHighlightEntryCard } from '../../components/menu/MenuHighlightEntryCard';
import { MenuHighlightSection } from '../../components/menu/MenuHighlightSection';
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
  | { type: 'loaded'; groups: MenuListScreenGroup[] }
  | { type: 'tagLoaded'; tag: Tag; entries: TagHighlightEntry[] };

export type MenuListScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  footer?: ReactNode;
  onHistoryPress?: () => void;
  preparingCount?: number;
  cartErrorMessage?: string | null;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  isSearching?: boolean;
  chipCategories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  chipTags: Tag[];
  selectedTagId: number | null;
  onSelectTag: (tagId: number) => void;
  variant: MenuListScreenVariant;
  onRetryButtonPress: () => void;
  onItemPress: (product: Product) => void;
  highlightSections: TagHighlight[];
  onHighlightEntryPress: (entry: TagHighlightEntry) => void;
  startingPriceByProductId: Record<number, number>;
  matchedLabelsByProductId: Record<number, string[]>;
  variantNameById: Record<number, string>;
  itemDetail: (MenuItemDetailScreenProps & { isOpen: true }) | null;
  cancelConfirmation: PaymentCancelAlertProps;
};

export const MenuListScreen = ({
  tableVariant,
  footer,
  onHistoryPress,
  preparingCount,
  cartErrorMessage,
  searchValue,
  onSearchValueChange,
  isSearching,
  chipCategories,
  selectedCategoryId,
  onSelectCategory,
  chipTags,
  selectedTagId,
  onSelectTag,
  variant,
  onRetryButtonPress,
  onItemPress,
  highlightSections,
  onHighlightEntryPress,
  startingPriceByProductId,
  matchedLabelsByProductId,
  variantNameById,
  itemDetail,
  cancelConfirmation,
}: MenuListScreenProps) => {
  return (
    <TableResolveScreen
      variant={tableVariant}
      footer={footer}
      onHistoryPress={onHistoryPress}
      preparingCount={preparingCount}
    >
      <YStack flex={1} gap="$3">
        <YStack
          gap="$2"
          top={0}
          zIndex={11}
          backgroundColor="$background"
          paddingBottom="$2"
        >
          <XStack gap="$2" alignItems="center">
            <Input
              flex={1}
              placeholder="Cari menu atau varian"
              value={searchValue}
              onChangeText={onSearchValueChange}
              accessibilityLabel="Cari menu atau varian"
            />
            {isSearching && <Spinner size="small" testID="search-spinner" />}
          </XStack>

          {(chipCategories.length > 0 || chipTags.length > 0) && (
            <CategoryChipList
              categories={chipCategories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              tags={chipTags}
              selectedTagId={selectedTagId}
              onSelectTag={onSelectTag}
            />
          )}
        </YStack>

        {cartErrorMessage ? (
          <Text color="$red10">{cartErrorMessage}</Text>
        ) : null}

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
            <ScrollView flex={1}>
              <YStack gap="$5">
                {highlightSections.map(({ tag, entries }) => (
                  <MenuHighlightSection
                    key={`highlight-${tag.id}`}
                    tag={tag}
                    entries={entries}
                    startingPriceByProductId={startingPriceByProductId}
                    onEntryPress={onHighlightEntryPress}
                  />
                ))}
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
                            matchedLabels={matchedLabelsByProductId[product.id]}
                            variantNameById={variantNameById}
                            onPress={() => onItemPress(product)}
                          />
                        </Focusable>
                      ))}
                    </YStack>
                  </YStack>
                ))}
              </YStack>
            </ScrollView>
          ))
          .with({ type: 'tagLoaded' }, ({ entries }) => (
            <ScrollView flex={1}>
              <YStack gap="$3">
                {entries.map((entry) => (
                  <MenuHighlightEntryCard
                    key={
                      entry.kind === 'variant'
                        ? `variant-${entry.variant.id}`
                        : `product-${entry.product.id}`
                    }
                    entry={entry}
                    startingPriceByProductId={startingPriceByProductId}
                    fullWidth
                    onPress={onHighlightEntryPress}
                  />
                ))}
              </YStack>
            </ScrollView>
          ))
          .exhaustive()}
      </YStack>

      {itemDetail && <MenuItemDetailScreen {...itemDetail} />}
      <PaymentCancelAlert {...cancelConfirmation} />
    </TableResolveScreen>
  );
};
