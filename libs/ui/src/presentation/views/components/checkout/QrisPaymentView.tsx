import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Button, Image, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';
import { formatRupiah } from '../../../../utils/currency';
import {
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

const QR_SIZE = 260;

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
  const [fallbackImageBase64, setFallbackImageBase64] = useState<
    string | null
  >(null);

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
    qrRef.current?.toDataURL((base64) => {
      if (isQrDownloadSupported()) {
        downloadQrImage(base64, reference);
      } else {
        setFallbackImageBase64(base64);
      }
    });
  };

  return (
    <YStack flex={1} alignItems="center" gap="$4" paddingVertical="$4">
      <Text fontWeight="bold" fontSize="$9">
        {formatRupiah(amount)}
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
        Simpan QR
      </Button>

      <Text fontWeight="bold" fontSize="$5">
        {secondsLeft > 0
          ? `Selesaikan pembayaran dalam ${formatCountdown(secondsLeft)}`
          : 'Memeriksa status pembayaran...'}
      </Text>

      <Paragraph textAlign="center" color="$color10">
        Simpan QR lalu buka aplikasi bank atau e-wallet Anda, dan pilih bayar
        QRIS dari galeri. Atau pindai dengan perangkat lain.
      </Paragraph>

      <XStack alignItems="center" gap="$2">
        <Spinner size="small" />
        <Text color="$color10">Menunggu pembayaran…</Text>
      </XStack>

      <Sheet
        isOpen={fallbackImageBase64 !== null}
        onOpenChange={(isOpen) => !isOpen && setFallbackImageBase64(null)}
      >
        <YStack padding="$4" gap="$3" alignItems="center">
          {fallbackImageBase64 ? (
            <Image
              src={qrImageDataUrl(fallbackImageBase64)}
              width={QR_SIZE}
              height={QR_SIZE}
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
