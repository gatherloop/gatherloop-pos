import { AlertCircle } from '@tamagui/lucide-icons';
import { Button, H4, Paragraph, YStack } from 'tamagui';

export type ErrorViewProps = {
  title: string;
  subtitle: string;
  onRetryButtonPress: () => void;
};

export const ErrorView = (props: ErrorViewProps) => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <AlertCircle size="$5" color="$red10" />
      <YStack>
        <H4 textAlign="center">{props.title}</H4>
        <Paragraph textAlign="center">{props.subtitle}</Paragraph>
      </YStack>
      <Button onPress={props.onRetryButtonPress}>Retry</Button>
    </YStack>
  );
};
