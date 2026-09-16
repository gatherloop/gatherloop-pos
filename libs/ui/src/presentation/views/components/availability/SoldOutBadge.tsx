import { SizableText, XStack } from 'tamagui';

export type SoldOutBadgeProps = {
  label: string;
};

export const SoldOutBadge = ({ label }: SoldOutBadgeProps) => (
  <XStack
    backgroundColor="$red5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
  >
    <SizableText size="$1" color="$red11">
      {label}
    </SizableText>
  </XStack>
);
