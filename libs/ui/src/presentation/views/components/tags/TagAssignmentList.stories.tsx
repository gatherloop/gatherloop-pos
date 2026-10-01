import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagAssignmentList } from './TagAssignmentList';

const meta: Meta<typeof TagAssignmentList> = {
  title: 'Components/Tags/TagAssignmentList',
  component: TagAssignmentList,
  args: {
    onRetryButtonPress: fn(),
    onProductToggle: fn(),
    onVariantToggle: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TagAssignmentList>;

export const Loaded: Story = {
  args: {
    variant: {
      type: 'loaded',
      categories: [
        {
          id: 1,
          name: 'Drinks',
          products: [
            {
              id: 12,
              name: 'Salted Caramel Macchiato',
              checkState: false,
              variants: [{ id: 105, name: 'Original', isChecked: false }],
            },
            {
              id: 13,
              name: 'Coffee Latte',
              checkState: 'indeterminate',
              variants: [
                { id: 106, name: 'Hot', isChecked: true },
                { id: 107, name: 'Iced', isChecked: false },
              ],
            },
          ],
        },
      ],
    },
  },
};

export const Loading: Story = { args: { variant: { type: 'loading' } } };
export const Empty: Story = { args: { variant: { type: 'empty' } } };
export const Error: Story = { args: { variant: { type: 'error' } } };
