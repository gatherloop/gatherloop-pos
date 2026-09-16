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

const flavor = {
  id: 2,
  name: 'Flavor',
  values: [
    { id: 3, name: 'Vanilla' },
    { id: 4, name: 'Banana' },
    { id: 5, name: 'Hazelnut' },
  ],
};

const meta: Meta<typeof OptionValueChipGroup> = {
  title: 'Components/Menu/OptionValueChipGroup',
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

export const WithSoldOutValue: Story = {
  args: {
    option: flavor,
    selectedOptionValueId: null,
    isOptionValueAvailable: { 3: false, 4: true, 5: true },
  },
};
