import { Box } from '@tamagui/lucide-icons';
import { Button, H4, Paragraph, YStack } from 'tamagui';

export type EmptyViewProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const EmptyView = (props: EmptyViewProps) => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <Box size="$5" />
      <H4 textAlign="center">{props.title}</H4>
      <Paragraph textAlign="center">{props.subtitle}</Paragraph>
      {props.actionLabel && props.onActionPress && (
        <Button onPress={props.onActionPress}>{props.actionLabel}</Button>
      )}
    </YStack>
  );
};
