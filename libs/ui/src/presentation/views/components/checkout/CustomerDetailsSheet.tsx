import {
  Button,
  Image,
  Input,
  Paragraph,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { match } from 'ts-pattern';
import {
  PaymentDiningOption,
  PaymentMethod,
} from '../../../../domain/entities/Payment';
import { Sheet } from '../base/Sheet';
import { CameraCapture } from '../base/CameraCapture';
import {
  ClipboardCheck,
  QrCode,
  RotateCcw,
  Wallet,
} from '@tamagui/lucide-icons';

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
  enabledMethods: PaymentMethod[];
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  diningOption: PaymentDiningOption;
  onDiningOptionChange: (diningOption: PaymentDiningOption) => void;
  cashierLocation: string;
  verificationPhoto: string | null;
  onCapturePhoto: (photo: string) => void;
  onRetakePhoto: () => void;
  isSubmitting: boolean;
};

const methodOptions: Record<
  PaymentMethod,
  {
    icon: typeof QrCode;
    accessibilityLabel: string;
    label: string;
    description: string;
  }
> = {
  qris: {
    icon: QrCode,
    accessibilityLabel: 'Bayar dengan QRIS',
    label: 'QRIS',
    description: 'Bayar lewat e-wallet',
  },
  cash: {
    icon: Wallet,
    accessibilityLabel: 'Bayar dengan Cash di Kasir',
    label: 'Cash',
    description: 'Bayar tunai di kasir',
  },
  cod: {
    icon: ClipboardCheck,
    accessibilityLabel: 'Bayar dengan COD',
    label: 'COD — Bayar saat ambil',
    description:
      'Pesanan dibuat setelah dikonfirmasi barista, bayar tunai di kasir saat mengambil',
  },
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
  enabledMethods,
  method,
  onMethodChange,
  diningOption,
  onDiningOptionChange,
  verificationPhoto,
  onCapturePhoto,
  onRetakePhoto,
  isSubmitting,
}: CustomerDetailsSheetProps) => {
  const isCodPhotoMissing = method === 'cod' && !verificationPhoto;
  const primaryLabel = isSubmitting
    ? 'Memproses…'
    : isCodPhotoMissing
    ? 'Ambil foto dulu'
    : submitLabel(method);

  return (
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
                disabled={isSubmitting}
              >
                {diningOptionLabel(option)}
              </Button>
            ))}
          </XStack>
        </YStack>

        {enabledMethods.length > 1 ? (
          <YStack gap="$2">
            <Paragraph fontWeight="bold">Metode Pembayaran</Paragraph>
            <XStack gap="$2" flexWrap="wrap">
              {enabledMethods.map((option) => {
                const {
                  icon: Icon,
                  accessibilityLabel,
                  label,
                  description,
                } = methodOptions[option];
                return (
                  <Button
                    key={option}
                    theme={method === option ? 'blue' : undefined}
                    variant={method === option ? undefined : 'outlined'}
                    minHeight={44}
                    height="auto"
                    paddingVertical="$3"
                    justifyContent="flex-start"
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => onMethodChange(option)}
                    scaleIcon={1}
                    flex={1}
                    disabled={isSubmitting}
                  >
                    <YStack alignItems="flex-start" gap="$1">
                      <XStack gap="$2" alignItems="center">
                        <Icon size="$1" />
                        <Paragraph fontWeight="bold">{label}</Paragraph>
                      </XStack>
                      <Paragraph
                        fontSize="$2"
                        color="$color10"
                        flex={1}
                        textWrap="wrap"
                      >
                        {description}
                      </Paragraph>
                    </YStack>
                  </Button>
                );
              })}
            </XStack>
          </YStack>
        ) : null}

        {method === 'cod' ? (
          <YStack gap="$2">
            {verificationPhoto ? (
              <YStack gap="$3" alignItems="center">
                <Image
                  src={`data:image/jpeg;base64,${verificationPhoto}`}
                  width={280}
                  height={210}
                  borderRadius="$4"
                />
                <Button
                  icon={RotateCcw}
                  onPress={onRetakePhoto}
                  disabled={isSubmitting}
                >
                  Ambil ulang
                </Button>
              </YStack>
            ) : (
              <CameraCapture onCapture={onCapturePhoto} />
            )}
          </YStack>
        ) : null}

        <YStack gap="$2">
          <Button
            theme="blue"
            size="$5"
            minHeight={44}
            onPress={onSubmitPress}
            disabled={isSubmitting || isCodPhotoMissing}
            icon={isSubmitting ? <Spinner /> : undefined}
          >
            {primaryLabel}
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
};
