import { X } from '@tamagui/lucide-icons';
import { Button, Text, TextArea, XStack, YStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar, which pull
// in solito/next — dead weight a Vite build has no business resolving.
import { CartItem } from '../../domain/entities/Cart';
import { formatRupiah } from '../../utils/currency';
import { Sheet } from '../components/base/Sheet/Sheet';
import { AmountStepper } from '../components/menu/AmountStepper';
import { MenuItemThumbnail } from '../components/menu/MenuItemThumbnail';

// FR-9 in docs/prd-order-app-ux-improvements.md: a small, presentational
// "review this line" modal. Only `amount` and `note` are editable — the
// variant renders as plain muted text, never as a chip or a control, per the
// scope decision in the PRD (changing a line's variant needs backend work
// this phase deliberately doesn't do). Everything rendered here already
// lives on the `CartItem` the composition root passes in — no fetch.
export type CartItemEditScreenProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: CartItem;
  amount: number;
  onAmountChange: (amount: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  isSaving: boolean;
  onSavePress: () => void;
};

export const CartItemEditScreen = ({
  isOpen,
  onOpenChange,
  item,
  amount,
  onAmountChange,
  note,
  onNoteChange,
  isSaving,
  onSavePress,
}: CartItemEditScreenProps) => {
  const optionValueNames = item.variant.values
    .map((value) => value.optionValue.name)
    .join(', ');

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

        <YStack flex={1} gap="$4" paddingHorizontal="$4" paddingBottom="$4">
          <XStack gap="$3" alignItems="center">
            <MenuItemThumbnail
              imageUrl={item.variant.product.imageUrl}
              station={item.variant.product.category.station}
              width={64}
              height={64}
              flexShrink={0}
            />
            <YStack flex={1} gap="$1">
              <Text fontSize="$6" fontWeight="bold" numberOfLines={1}>
                {item.variant.product.name}
              </Text>
              {optionValueNames ? (
                <Text color="$color10" numberOfLines={1}>
                  {optionValueNames}
                </Text>
              ) : null}
            </YStack>
          </XStack>

          <YStack gap="$2">
            <Text fontWeight="bold">Catatan</Text>
            <TextArea
              placeholder="Contoh: less sugar, tanpa es"
              value={note}
              onChangeText={onNoteChange}
              accessibilityLabel="Catatan"
              minHeight={80}
              maxLength={255}
            />
          </YStack>

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">Jumlah</Text>
            <AmountStepper amount={amount} onChange={onAmountChange} />
          </XStack>
        </YStack>

        <YStack
          padding="$4"
          gap="$2"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          <XStack justifyContent="space-between">
            <Text fontWeight="bold">Total</Text>
            <Text fontWeight="bold">{formatRupiah(item.price * amount)}</Text>
          </XStack>
          <Button
            theme="blue"
            size="$5"
            minHeight={44}
            disabled={isSaving}
            onPress={onSavePress}
          >
            Simpan
          </Button>
        </YStack>
      </YStack>
    </Sheet>
  );
};
