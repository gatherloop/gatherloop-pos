import { Button, Input, Paragraph, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { PaymentMethod } from '../../../../domain/entities/Payment';
import { Sheet } from '../base/Sheet';

export type CustomerNameSheetProps = {
  isOpen: boolean;
  name: string;
  errorMessage: string | null;
  onNameChange: (name: string) => void;
  onSubmitPress: () => void;
  onCancelPress: () => void;
  isCashPaymentEnabled: boolean;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  cashierLocation: string;
};

const submitLabel = (method: PaymentMethod) =>
  match(method)
    .with('qris', () => 'Lanjutkan ke pembayaran')
    .with('cash', () => 'Pesan & bayar di kasir')
    .exhaustive();

export const CustomerNameSheet = ({
  isOpen,
  name,
  errorMessage,
  onNameChange,
  onSubmitPress,
  onCancelPress,
  isCashPaymentEnabled,
  method,
  onMethodChange,
  cashierLocation,
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

      {isCashPaymentEnabled ? (
        <YStack gap="$2">
          <Button
            theme={method === 'qris' ? 'blue' : undefined}
            variant={method === 'qris' ? undefined : 'outlined'}
            minHeight={44}
            height="auto"
            paddingVertical="$3"
            justifyContent="flex-start"
            accessibilityLabel="Bayar dengan QRIS"
            onPress={() => onMethodChange('qris')}
          >
            <YStack alignItems="flex-start" gap="$1">
              <Paragraph fontWeight="bold">Bayar dengan QRIS</Paragraph>
              <Paragraph fontSize="$2" color="$color10">
                Scan atau simpan QR, bayar dari aplikasi bank atau e-wallet
              </Paragraph>
            </YStack>
          </Button>
          <Button
            theme={method === 'cash' ? 'blue' : undefined}
            variant={method === 'cash' ? undefined : 'outlined'}
            minHeight={44}
            height="auto"
            paddingVertical="$3"
            justifyContent="flex-start"
            accessibilityLabel="Bayar dengan Cash di Kasir"
            onPress={() => onMethodChange('cash')}
          >
            <YStack alignItems="flex-start" gap="$1">
              <Paragraph fontWeight="bold">Bayar dengan Cash di Kasir</Paragraph>
              <Paragraph fontSize="$2" color="$color10">
                Bayar tunai di kasir {cashierLocation}
              </Paragraph>
            </YStack>
          </Button>
        </YStack>
      ) : null}

      <YStack gap="$2">
        <Button theme="blue" size="$5" minHeight={44} onPress={onSubmitPress}>
          {submitLabel(method)}
        </Button>
        <Button variant="outlined" minHeight={44} onPress={onCancelPress}>
          Batal
        </Button>
      </YStack>
    </YStack>
  </Sheet>
);
