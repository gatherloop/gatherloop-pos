import { AlertCircle } from '@tamagui/lucide-icons';
import { Button, H4, Paragraph, YStack } from 'tamagui';

export type ErrorType = 'network' | 'server' | 'unknown';

const errorTypeMessages: Record<ErrorType, string> = {
  network: 'Network error - please check your connection and try again.',
  server: 'Server error - please try again later.',
  unknown: 'An unexpected error occurred. Please try again.',
};

export type ErrorViewProps = {
  title: string;
  subtitle: string;
  onRetryButtonPress: () => void;
  errorType?: ErrorType;
};

export const ErrorView = (props: ErrorViewProps) => {
  const subtitle = props.errorType
    ? errorTypeMessages[props.errorType]
    : props.subtitle;

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <AlertCircle size="$5" color="$red10" />
      <YStack>
        <H4 textAlign="center">{props.title}</H4>
        <Paragraph textAlign="center">{subtitle}</Paragraph>
      </YStack>
      <Button onPress={props.onRetryButtonPress}>Retry</Button>
    </YStack>
  );
};
