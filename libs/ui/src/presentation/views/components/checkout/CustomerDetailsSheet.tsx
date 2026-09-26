import { Button, Input, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import {
  PaymentDiningOption,
  PaymentMethod,
} from '../../../../domain/entities/Payment';
import { Sheet } from '../base/Sheet';
import { QrCode, Wallet } from '@tamagui/lucide-icons';

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
  isSubmitting: boolean;
};

const diningOptionLabel = (diningOption: PaymentDiningOption) =>
  match(diningOption)
    .with('dine_in', () => 'Makan di sini')
    .with('takeaway', () => 'Bawa pulang')
    .exhaustive();

const submitLabel = (method: PaymentMethod) =>
  match(method)
    .with('qris', () => 'Lanjutkan Pembayaran')
    .with('cash', () => 'Bayar di kasir')
    .with('cod', () => 'Pesan dengan COD')
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
  isSubmitting,
}: CustomerDetailsSheetProps) => (
  <Sheet
    isOpen={isOpen}
    onOpenChange={(open) => !open && !isSubmitting && onCancelPress()}
  >
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
        {whatsappNumberErrorMessage ? (
          <Paragraph color="$red10">{whatsappNumberErrorMessage}</Paragraph>
        ) : null}
        <Paragraph fontSize="$2" color="$color10">
          Nomor ini akan digunakan untuk mengabari Anda apabila pesanan siap
          diambil.
        </Paragraph>
      </YStack>

      <YStack gap="$2">
        <Paragraph fontWeight="bold">Makan di sini atau bawa pulang?</Paragraph>
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
              disabled={isSubmitting}
            >
              {diningOptionLabel(option)}
            </Button>
          ))}
        </XStack>
      </YStack>

      {isCashPaymentEnabled ? (
        <YStack gap="$2">
          <Paragraph fontWeight="bold">Metode Pembayaran</Paragraph>
          <XStack gap="$2">
            <Button
              theme={method === 'qris' ? 'blue' : undefined}
              variant={method === 'qris' ? undefined : 'outlined'}
              minHeight={44}
              height="auto"
              paddingVertical="$3"
              justifyContent="flex-start"
              accessibilityLabel="Bayar dengan QRIS"
              onPress={() => onMethodChange('qris')}
              scaleIcon={1}
              flex={1}
              disabled={isSubmitting}
            >
              <YStack alignItems="flex-start">
                <XStack gap="$2" alignItems="center">
                  <QrCode size="$1" />
                  <Paragraph fontWeight="bold">QRIS</Paragraph>
                </XStack>
                <Paragraph fontSize="$2" color="$color10">
                  Bayar lewat e-wallet
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
              flex={1}
              disabled={isSubmitting}
            >
              <YStack alignItems="flex-start" gap="$1">
                <XStack gap="$2" alignItems="center">
                  <Wallet size="$1" />
                  <Paragraph fontWeight="bold">Cash</Paragraph>
                </XStack>
                <Paragraph
                  fontSize="$2"
                  color="$color10"
                  flex={1}
                  textWrap="wrap"
                >
                  Bayar tunai di kasir
                </Paragraph>
              </YStack>
            </Button>
          </XStack>
        </YStack>
      ) : null}

      <YStack gap="$2">
        <Button
          theme="blue"
          size="$5"
          minHeight={44}
          onPress={onSubmitPress}
          disabled={isSubmitting}
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          {isSubmitting ? 'Memproses…' : submitLabel(method)}
        </Button>
        <Button
          variant="outlined"
          minHeight={44}
          onPress={onCancelPress}
          disabled={isSubmitting}
        >
          Batal
        </Button>
      </YStack>
    </YStack>
  </Sheet>
);
