import type { Meta, StoryObj } from '@storybook/react';
import { OptionValueChipGroup } from './OptionValueChipGroup';

const ukuran = {
  id: 1,
  name: 'Ukuran',
  values: [
    { id: 1, name: 'Regular' },
    { id: 2, name: 'Large' },
  ],
};

const meta: Meta<typeof OptionValueChipGroup> = {
  title: 'Menu/OptionValueChipGroup',
  component: OptionValueChipGroup,
  args: {
    option: ukuran,
    onSelectOptionValue: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof OptionValueChipGroup>;

export const NoneSelected: Story = {
  args: { selectedOptionValueId: null },
};

export const Selected: Story = {
  args: { selectedOptionValueId: 2 },
};
