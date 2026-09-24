import { Button, Input, Paragraph, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import {
  PaymentDiningOption,
  PaymentMethod,
} from '../../../../domain/entities/Payment';
import { Sheet } from '../base/Sheet';

export type CustomerDetailsSheetProps = {
  isOpen: boolean;
  name: string;
  nameErrorMessage: string | null;
  onNameChange: (name: string) => void;
  whatsappNumber: string;
  whatsappNumberErrorMessage: string | null;
  onWhatsappNumberChange: (whatsappNumber: string) => void;
  onSubmitPress: () => void;
  onCancelPress: () => void;
  isCashPaymentEnabled: boolean;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  diningOption: PaymentDiningOption;
  onDiningOptionChange: (diningOption: PaymentDiningOption) => void;
  cashierLocation: string;
};

const diningOptionLabel = (diningOption: PaymentDiningOption) =>
  match(diningOption)
    .with('dine_in', () => 'Makan di sini')
    .with('takeaway', () => 'Bawa pulang')
    .exhaustive();

const submitLabel = (method: PaymentMethod) =>
  match(method)
    .with('qris', () => 'Lanjutkan ke pembayaran')
    .with('cash', () => 'Pesan & bayar di kasir')
    .exhaustive();

export const CustomerDetailsSheet = ({
  isOpen,
  name,
  nameErrorMessage,
  onNameChange,
  whatsappNumber,
  whatsappNumberErrorMessage,
  onWhatsappNumberChange,
  onSubmitPress,
  onCancelPress,
  isCashPaymentEnabled,
  method,
  onMethodChange,
  diningOption,
  onDiningOptionChange,
  cashierLocation,
}: CustomerDetailsSheetProps) => (
  <Sheet isOpen={isOpen} onOpenChange={(open) => !open && onCancelPress()}>
    <YStack padding="$4" gap="$3">
      <Paragraph fontWeight="bold" fontSize="$6">
        Data pemesan
      </Paragraph>

      <YStack gap="$2">
        <Input
          value={name}
          placeholder="Nama Anda"
          onChangeText={onNameChange}
          onSubmitEditing={onSubmitPress}
          accessibilityLabel="Nama Anda"
          autoFocus
        />
        {nameErrorMessage ? (
          <Paragraph color="$red10">{nameErrorMessage}</Paragraph>
        ) : null}
      </YStack>

      <YStack gap="$2">
        <Input
          value={whatsappNumber}
          placeholder="0812 3456 7890"
          onChangeText={onWhatsappNumberChange}
          onSubmitEditing={onSubmitPress}
          accessibilityLabel="Nomor WhatsApp"
          inputMode="tel"
          autoComplete="tel"
        />
        {whatsappNumberErrorMessage ? (
          <Paragraph color="$red10">{whatsappNumberErrorMessage}</Paragraph>
        ) : null}
        <Paragraph fontSize="$2" color="$color10">
          Nomor ini akan kami gunakan untuk mengabari Anda lewat WhatsApp saat
          pesanan siap diambil.
        </Paragraph>
      </YStack>

      <YStack gap="$2">
        <Paragraph fontWeight="bold">
          Makan di sini atau bawa pulang?
        </Paragraph>
        <XStack gap="$2">
          {(['dine_in', 'takeaway'] as const).map((option) => (
            <Button
              key={option}
              flex={1}
              theme={diningOption === option ? 'blue' : undefined}
              variant={diningOption === option ? undefined : 'outlined'}
              minHeight={44}
              accessibilityLabel={diningOptionLabel(option)}
              onPress={() => onDiningOptionChange(option)}
            >
              {diningOptionLabel(option)}
            </Button>
          ))}
        </XStack>
      </YStack>

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
