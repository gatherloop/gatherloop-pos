import { X } from '@tamagui/lucide-icons';
import { Button, Paragraph, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar, which pull
// in solito/next — dead weight a Vite build has no business resolving.
import { Product } from '../../domain/entities/Product';
import { formatRupiah } from '../../utils/currency';
import { ErrorView } from '../components/base/ErrorView';
import { LoadingView } from '../components/base/LoadingView';
import { Sheet } from '../components/base/Sheet/Sheet';
import { AmountStepper } from '../components/menu/AmountStepper';
import { MenuItemThumbnail } from '../components/menu/MenuItemThumbnail';
import { OptionValueChipGroup } from '../components/menu/OptionValueChipGroup';

export type MenuItemDetailScreenVariant =
  | { type: 'loading' }
  | { type: 'error' }
  | {
      type: 'ready';
      product: Product;
      isResolvingVariant: boolean;
      price: number | null;
      variantErrorMessage: string | null;
    };

export type MenuItemDetailScreenProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  variant: MenuItemDetailScreenVariant;
  selectedOptionValueIds: number[];
  onSelectOptionValue: (optionId: number, optionValueId: number) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  isAddToCartEnabled: boolean;
  onAddToCartPress: () => void;
  onRetryButtonPress: () => void;
};

// FR-6 in docs/prd-table-ordering.md: the item detail sheet, mounted at
// `/order/t/{code}/products/{productId}` over the menu (route-addressable
// so Android back and deep links behave). The Add-to-cart CTA is enabled
// exactly when `variant.type === 'ready'` (via `isAddToCartEnabled`) — a
// state the handler derives, never an `if` in this component.
export const MenuItemDetailScreen = ({
  isOpen,
  onOpenChange,
  variant,
  selectedOptionValueIds,
  onSelectOptionValue,
  amount,
  onAmountChange,
  note,
  onNoteChange,
  isAddToCartEnabled,
  onAddToCartPress,
  onRetryButtonPress,
}: MenuItemDetailScreenProps) => {
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <YStack flex={1}>
        <XStack justifyContent="flex-end" padding="$3">
          <Button
            icon={X}
            variant="outlined"
            circular
            width={44}
            height={44}
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Tutup"
          />
        </XStack>

        {match(variant)
          .with({ type: 'loading' }, () => (
            <LoadingView title="Memuat produk..." />
          ))
          .with({ type: 'error' }, () => (
            <ErrorView
              title="Gagal memuat produk"
              subtitle="Terjadi kesalahan. Silakan coba lagi."
              onRetryButtonPress={onRetryButtonPress}
            />
          ))
          .with(
            { type: 'ready' },
            ({ product, isResolvingVariant, price, variantErrorMessage }) => (
              <YStack flex={1}>
                <ScrollView flex={1}>
                  <YStack gap="$4" paddingHorizontal="$4" paddingBottom="$4">
                    <MenuItemThumbnail
                      imageUrl={product.imageUrl}
                      station={product.category.station}
                      width="100%"
                      height={220}
                    />

                    <YStack gap="$2">
                      <Text fontSize="$7" fontWeight="bold">
                        {product.name}
                      </Text>
                      {product.description ? (
                        <Paragraph color="$color10">
                          {product.description}
                        </Paragraph>
                      ) : null}
                    </YStack>

                    {product.options.map((option) => (
                      <OptionValueChipGroup
                        key={option.id}
                        option={option}
                        selectedOptionValueId={
                          selectedOptionValueIds.find((id) =>
                            option.values.some((value) => value.id === id)
                          ) ?? null
                        }
                        onSelectOptionValue={(optionValueId) =>
                          onSelectOptionValue(option.id, optionValueId)
                        }
                      />
                    ))}

                    {variantErrorMessage ? (
                      <Text color="$red10">{variantErrorMessage}</Text>
                    ) : null}

                    <YStack gap="$2">
                      <Text fontWeight="bold">Catatan</Text>
                      <TextArea
                        placeholder="Contoh: less sugar, tanpa es"
                        value={note}
                        onChangeText={onNoteChange}
                        accessibilityLabel="Catatan"
                        minHeight={80}
                      />
                    </YStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontWeight="bold">Jumlah</Text>
                      <AmountStepper
                        amount={amount}
                        onChange={onAmountChange}
                      />
                    </XStack>
                  </YStack>
                </ScrollView>

                <YStack
                  padding="$4"
                  borderTopWidth={1}
                  borderTopColor="$borderColor"
                  backgroundColor="$background"
                >
                  <Button
                    theme="blue"
                    size="$5"
                    minHeight={44}
                    disabled={!isAddToCartEnabled}
                    onPress={onAddToCartPress}
                  >
                    {isAddToCartEnabled && price !== null
                      ? `Tambah ke keranjang · ${formatRupiah(price * amount)}`
                      : isResolvingVariant
                        ? 'Menghitung harga...'
                        : 'Pilih semua opsi'}
                  </Button>
                </YStack>
              </YStack>
            )
          )
          .exhaustive()}
      </YStack>
    </Sheet>
  );
};
