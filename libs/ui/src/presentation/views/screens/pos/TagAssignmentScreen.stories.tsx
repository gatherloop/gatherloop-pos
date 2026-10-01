import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagAssignmentScreen } from './TagAssignmentScreen';

const defaultArgs = {
  onLogoutPress: fn(),
  tagName: 'New',
  searchValue: '',
  onSearchValueChange: fn(),
  onRetryButtonPress: fn(),
  onProductToggle: fn(),
  onVariantToggle: fn(),
  selectedVariantCount: 3,
  onSavePress: fn(),
  isSaveDisabled: false,
  isSaving: false,
};

const meta: Meta<typeof TagAssignmentScreen> = {
  title: 'Screens/POS/TagAssignmentScreen',
  component: TagAssignmentScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TagAssignmentScreen>;

export const Loaded: Story = {
  args: {
    variant: {
      type: 'loaded',
      categories: [
        {
          id: 1,
          name: 'Snacks',
          products: [
            {
              id: 11,
              name: 'Pancong',
              checkState: 'indeterminate',
              variants: [
                { id: 101, name: 'Choco', isChecked: false },
                { id: 102, name: 'Matcha', isChecked: false },
                { id: 103, name: 'Vanilla', isChecked: false },
                { id: 104, name: 'Ice Cream', isChecked: true },
              ],
            },
          ],
        },
        {
          id: 2,
          name: 'Drinks',
          products: [
            {
              id: 12,
              name: 'Salted Caramel Macchiato',
              checkState: true,
              variants: [{ id: 105, name: 'Original', isChecked: true }],
            },
            {
              id: 13,
              name: 'Coffee Latte',
              checkState: true,
              variants: [
                { id: 106, name: 'Hot', isChecked: true },
                { id: 107, name: 'Iced', isChecked: true },
              ],
            },
          ],
        },
      ],
    },
  },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' }, isSaveDisabled: true },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' }, searchValue: 'zzz' },
};

export const Error: Story = {
  args: { variant: { type: 'error' }, isSaveDisabled: true },
};

export const Saving: Story = {
  args: { ...Loaded.args, isSaving: true, isSaveDisabled: true },
};

export const SaveFailed: Story = {
  args: { ...Loaded.args, serverError: 'Failed to save. Please try again.' },
};
