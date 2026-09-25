import { X } from '@tamagui/lucide-icons';
import {
  Button,
  Paragraph,
  ScrollView,
  Text,
  TextArea,
  XStack,
  YStack,
} from 'tamagui';
import { CartItem } from '../../../../domain/entities/Cart';
import { formatRupiah } from '../../../../utils/currency';
import { Sheet } from '../../components/base/Sheet/Sheet';
import {
  PendingPaymentNotice,
  PendingPaymentNoticeProps,
} from '../../components/cart/PendingPaymentNotice';
import { AmountStepper } from '../../components/menu/AmountStepper';
import { MenuItemThumbnail } from '../../components/menu/MenuItemThumbnail';

const SoldOutBadge = () => (
  <XStack
    backgroundColor="$red5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$red11">
      Habis
    </Paragraph>
  </XStack>
);

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
  lockedNotice: PendingPaymentNoticeProps | null;
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
  lockedNotice,
}: CartItemEditScreenProps) => {
  const optionValueNames = item.variant.values
    .map((value) => value.optionValue.name)
    .join(', ');

  const isSoldOut = !item.variant.isSellable;
  const remainingQuantity = item.variant.sellableQuantity;
  const isLocked = lockedNotice !== null;

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

        <ScrollView>
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
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$6" fontWeight="bold" numberOfLines={1}>
                    {item.variant.product.name}
                  </Text>
                  {isSoldOut ? <SoldOutBadge /> : null}
                </XStack>
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
                disabled={isLocked}
              />
            </YStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="bold">Jumlah</Text>
              <AmountStepper
                amount={amount}
                onChange={onAmountChange}
                max={remainingQuantity}
                disabled={isSoldOut || isLocked}
                size="sm"
              />
            </XStack>
          </YStack>
        </ScrollView>

        <YStack
          padding="$4"
          gap="$2"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          {lockedNotice ? (
            <PendingPaymentNotice {...lockedNotice} />
          ) : (
            <>
              <XStack justifyContent="space-between">
                <Text fontWeight="bold">Total</Text>
                <Text fontWeight="bold">
                  {formatRupiah(item.price * amount)}
                </Text>
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
            </>
          )}
        </YStack>
      </YStack>
    </Sheet>
  );
};
