import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagListItem } from './TagListItem';

const meta: Meta<typeof TagListItem> = {
  title: 'Components/Tags/TagListItem',
  component: TagListItem,
  args: {
    name: 'Best Seller',
    color: 'orange',
    isHighlighted: true,
    variantCount: 5,
    onEditMenuPress: fn(),
    onAssignMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TagListItem>;

export const Highlighted: Story = {};

export const NotHighlighted: Story = {
  args: { name: 'Vegan', color: 'blue', isHighlighted: false, variantCount: 1 },
};

export const Unassigned: Story = {
  args: { variantCount: 0 },
};
