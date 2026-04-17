import { XStack, Paragraph } from 'tamagui';
import { AlertCircle } from '@tamagui/lucide-icons';

export const FormErrorBanner = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <XStack
      backgroundColor="$red2"
      padding="$3"
      borderRadius="$2"
      gap="$2"
      alignItems="center"
    >
      <AlertCircle size="$1" color="$red10" />
      <Paragraph color="$red10">{message}</Paragraph>
    </XStack>
  );
};
