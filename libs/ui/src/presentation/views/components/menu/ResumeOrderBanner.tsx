import { Button, Text, XStack } from 'tamagui';

export type ResumeOrderBannerProps = {
  onPress: () => void;
};

export const ResumeOrderBanner = ({ onPress }: ResumeOrderBannerProps) => (
  <XStack
    padding="$3"
    borderRadius="$4"
    backgroundColor="$orange3"
    borderWidth={1}
    borderColor="$orange7"
    alignItems="center"
    gap="$3"
  >
    <Text flex={1} color="$orange11">
      Pesanan Anda sedang disiapkan
    </Text>
    <Button size="$3" theme="orange" onPress={onPress}>
      Lihat Status
    </Button>
  </XStack>
);
