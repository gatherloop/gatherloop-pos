import { Button, Input, Paragraph, YStack } from 'tamagui';
import { Sheet } from '../base/Sheet';

export type CustomerNameSheetProps = {
  isOpen: boolean;
  name: string;
  errorMessage: string | null;
  onNameChange: (name: string) => void;
  onSubmitPress: () => void;
  onCancelPress: () => void;
};

// FR-9/UX step 3: opens on the pay button before any QR is generated (D17)
// — a cancel here has created nothing at all. `name`/`errorMessage` are
// machine state (CheckoutUsecase), not local form state, so validation
// stays in the reducer and this stays a dumb view.
export const CustomerNameSheet = ({
  isOpen,
  name,
  errorMessage,
  onNameChange,
  onSubmitPress,
  onCancelPress,
}: CustomerNameSheetProps) => (
  <Sheet isOpen={isOpen} onOpenChange={(open) => !open && onCancelPress()}>
    <YStack padding="$4" gap="$3">
      <Paragraph fontWeight="bold" fontSize="$6">
        Atas nama siapa pesanan ini?
      </Paragraph>

      <Input
        value={name}
        placeholder="Nama Anda"
        onChangeText={onNameChange}
        onSubmitEditing={onSubmitPress}
        accessibilityLabel="Nama Anda"
        autoFocus
      />

      {errorMessage ? (
        <Paragraph color="$red10">{errorMessage}</Paragraph>
      ) : null}

      <YStack gap="$2">
        <Button theme="blue" size="$5" minHeight={44} onPress={onSubmitPress}>
          Lanjutkan ke pembayaran
        </Button>
        <Button variant="outlined" minHeight={44} onPress={onCancelPress}>
          Batal
        </Button>
      </YStack>
    </YStack>
  </Sheet>
);
