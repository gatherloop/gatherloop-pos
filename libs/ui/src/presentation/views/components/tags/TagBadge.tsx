import { SizableText, XStack } from 'tamagui';
import { TagColor } from '../../../../domain';
import { tagColorBackground, tagColorForeground } from './tagColors';

export type TagBadgeProps = {
  label: string;
  color: TagColor;
};

export const TagBadge = ({ label, color }: TagBadgeProps) => (
  <XStack
    backgroundColor={tagColorBackground(color)}
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <SizableText size="$1" color={tagColorForeground(color)}>
      {label}
    </SizableText>
  </XStack>
);
