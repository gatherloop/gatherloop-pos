import type { Meta, StoryObj } from '@storybook/react';
import { Theme, XStack, YStack } from 'tamagui';
import { TagBadge } from './TagBadge';
import { TagColor, tagColors } from '../../../../domain';

const meta: Meta<typeof TagBadge> = {
  title: 'Components/Tags/TagBadge',
  component: TagBadge,
  args: { label: 'Best Seller', color: 'orange' },
};

export default meta;
type Story = StoryObj<typeof TagBadge>;

export const Default: Story = {};

export const VariantScope: Story = {
  args: { label: 'New · Ice Cream', color: 'green' },
};

const ColorRow = ({ themeName }: { themeName: 'light' | 'dark' }) => (
  <Theme name={themeName}>
    <XStack gap="$2" flexWrap="wrap" padding="$3" backgroundColor="$background">
      {tagColors.map((color: TagColor) => (
        <TagBadge key={color} label={color} color={color} />
      ))}
    </XStack>
  </Theme>
);

export const AllColorsInBothThemes: Story = {
  render: () => (
    <YStack>
      <ColorRow themeName="light" />
      <ColorRow themeName="dark" />
    </YStack>
  ),
};
