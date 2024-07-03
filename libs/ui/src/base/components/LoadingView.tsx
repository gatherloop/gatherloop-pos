import { Paragraph, Spinner, YStack } from 'tamagui';

export type LoadingViewProps = {
  title: string;
};

export const LoadingView = (props: LoadingViewProps) => {
  return (
    <YStack justifyContent="center" alignItems="center" flex={1} gap="$3">
      <Spinner size="large" />
      <Paragraph>{props.title}</Paragraph>
    </YStack>
  );
};
