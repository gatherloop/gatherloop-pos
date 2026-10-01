import { Paragraph, XStack } from 'tamagui';
import { TagColor } from '../../../../domain';
import { tagColorBackground, tagColorForeground } from './tagColors';

export type TagColorPillProps = {
  name: string;
  color: TagColor;
};

export const TagColorPill = ({ name, color }: TagColorPillProps) => (
  <XStack
    backgroundColor={tagColorBackground(color)}
    paddingHorizontal="$2.5"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$2" color={tagColorForeground(color)}>
      {name}
    </Paragraph>
  </XStack>
);
