import type { Meta, StoryObj } from '@storybook/react';
import { TagColorPill } from './TagColorPill';

const meta: Meta<typeof TagColorPill> = {
  title: 'Components/Tags/TagColorPill',
  component: TagColorPill,
  args: { name: 'Best Seller', color: 'orange' },
};

export default meta;
type Story = StoryObj<typeof TagColorPill>;

export const Orange: Story = {};

export const Green: Story = { args: { name: 'New', color: 'green' } };

export const Gray: Story = { args: { name: 'Draft', color: 'gray' } };
