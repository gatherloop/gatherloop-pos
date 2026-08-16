import QRCode from 'react-native-qrcode-svg';
import { Button, Paragraph, YStack } from 'tamagui';
import { Printer, RefreshCw } from '@tamagui/lucide-icons';
import { getTableOrderUrl } from '../../../utils';

export type TableQrCodeProps = {
  code: string;
  label: string;
  size?: number;
  onPrintPress?: () => void;
  onRegenerateCodePress?: () => void;
};

export const TableQrCode = ({
  code,
  label,
  size = 200,
  onPrintPress,
  onRegenerateCodePress,
}: TableQrCodeProps) => {
  return (
    <YStack alignItems="center" gap="$3" padding="$3">
      <YStack
        backgroundColor="white"
        padding="$3"
        borderRadius="$4"
        testID="table-qr-code"
      >
        <QRCode value={getTableOrderUrl(code)} size={size} />
      </YStack>
      <YStack alignItems="center">
        <Paragraph fontWeight="bold" size="$6">
          {label}
        </Paragraph>
        <Paragraph color="$gray10">{code}</Paragraph>
      </YStack>
      <YStack gap="$2" width="100%">
        {onPrintPress && (
          <Button icon={Printer} onPress={onPrintPress}>
            Print
          </Button>
        )}
        {onRegenerateCodePress && (
          <Button
            icon={RefreshCw}
            variant="outlined"
            onPress={onRegenerateCodePress}
          >
            Regenerate Code
          </Button>
        )}
      </YStack>
    </YStack>
  );
};
