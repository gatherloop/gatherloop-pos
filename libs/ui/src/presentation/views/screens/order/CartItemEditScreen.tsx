import { X } from '@tamagui/lucide-icons';
import { Button, Paragraph, XStack, YStack } from 'tamagui';
import { CartItem, CartItemEditForm } from '../../../../domain/entities/Cart';
import { Sheet } from '../../components/base/Sheet/Sheet';
import { CartItemEditFormView } from '../../components/cart/CartItemEditFormView';
import { PendingPaymentNoticeProps } from '../../components/cart/PendingPaymentNotice';

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
  defaultValues: CartItemEditForm;
  onSubmit: (values: CartItemEditForm) => void;
  isSaving: boolean;
  lockedNotice: PendingPaymentNoticeProps | null;
};

export const CartItemEditScreen = ({
  isOpen,
  onOpenChange,
  item,
  defaultValues,
  onSubmit,
  isSaving,
  lockedNotice,
}: CartItemEditScreenProps) => (
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

      <CartItemEditFormView
        item={item}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isSaving={isSaving}
        lockedNotice={lockedNotice}
        soldOutBadge={<SoldOutBadge />}
      />
    </YStack>
  </Sheet>
);
