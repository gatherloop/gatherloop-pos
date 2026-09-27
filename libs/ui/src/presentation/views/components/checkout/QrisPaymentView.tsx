import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import {
  Button,
  Image,
  Paragraph,
  Spinner,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import { ORDER_BRAND_NAME } from '../../../../utils/brand';
import { formatRupiah } from '../../../../utils/currency';
import {
  type ComposedQrImage,
  composeQrDownloadImage,
  downloadQrImage,
  isQrDownloadSupported,
  qrImageDataUrl,
} from '../../../../utils/qrDownload';
import { Sheet } from '../base/Sheet';

export type QrisPaymentViewProps = {
  qrContent: string;
  amount: number;
  expiredAt: string;
  reference: string;
  onCountdownElapsed: () => void;
};

const QR_SIZE = 220;

function secondsUntil(expiredAt: string): number {
  return Math.max(
    0,
    Math.round((new Date(expiredAt).getTime() - Date.now()) / 1000)
  );
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const QrisPaymentView = ({
  qrContent,
  amount,
  expiredAt,
  reference,
  onCountdownElapsed,
}: QrisPaymentViewProps) => {
  const qrRef = useRef<{
    toDataURL: (callback: (base64: string) => void) => void;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiredAt));
  const hasElapsed = useRef(false);
  const [fallbackImage, setFallbackImage] = useState<ComposedQrImage | null>(
    null
  );

  useEffect(() => {
    const timerId = setInterval(() => {
      setSecondsLeft(secondsUntil(expiredAt));
    }, 1000);
    return () => clearInterval(timerId);
  }, [expiredAt]);

  useEffect(() => {
    if (secondsLeft === 0 && !hasElapsed.current) {
      hasElapsed.current = true;
      onCountdownElapsed();
    }
  }, [secondsLeft, onCountdownElapsed]);

  const handleSavePress = () => {
    qrRef.current?.toDataURL(async (base64) => {
      const composedImage = await composeQrDownloadImage(
        base64,
        ORDER_BRAND_NAME,
        formatRupiah(amount)
      );
      if (isQrDownloadSupported()) {
        downloadQrImage(composedImage.base64, reference);
      } else {
        setFallbackImage(composedImage);
      }
    });
  };

  return (
    <YStack flex={1} alignItems="center" gap="$4" paddingVertical="$4">
      <Text fontWeight="bold" fontSize="$8">
        {formatRupiah(amount)}
      </Text>

      <Text fontWeight="bold" fontSize="$5" textAlign="center">
        {secondsLeft > 0
          ? `Selesaikan pembayaran dalam ${formatCountdown(secondsLeft)}`
          : 'Memeriksa status pembayaran...'}
      </Text>

      <YStack backgroundColor="white" padding="$3" borderRadius="$4">
        <QRCode
          value={qrContent}
          size={QR_SIZE}
          getRef={(ref) => {
            qrRef.current = ref;
          }}
        />
      </YStack>

      <Button minHeight={44} onPress={handleSavePress}>
        Download QR
      </Button>

      <Paragraph textAlign="center" color="$color10">
        Download QR dan buka di aplikasi e-wallet Anda. Atau scan QR menggunakan
        perangkat lain.
      </Paragraph>

      <Sheet
        isOpen={fallbackImage !== null}
        onOpenChange={(isOpen) => !isOpen && setFallbackImage(null)}
      >
        <YStack padding="$4" gap="$3" alignItems="center">
          {fallbackImage ? (
            <Image
              src={qrImageDataUrl(fallbackImage.base64)}
              width={QR_SIZE}
              height={(fallbackImage.height / fallbackImage.width) * QR_SIZE}
            />
          ) : null}
          <Paragraph textAlign="center">
            Tekan dan tahan gambar untuk menyimpan
          </Paragraph>
        </YStack>
      </Sheet>
    </YStack>
  );
};
