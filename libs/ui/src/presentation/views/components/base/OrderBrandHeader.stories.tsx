import type { Meta, StoryObj } from '@storybook/react';
import { OrderBrandHeader } from './OrderBrandHeader';

const DATA_URI_LOGO =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiI+PHJlY3Qgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBmaWxsPSIjMDA5MWZmIi8+PC9zdmc+';

const meta: Meta<typeof OrderBrandHeader> = {
  title: 'Components/Base/OrderBrandHeader',
  component: OrderBrandHeader,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof OrderBrandHeader>;

export const WithTableLine: Story = {
  args: {
    logoUri: DATA_URI_LOGO,
    tableLine: 'Meja 3 · Lantai 2',
  },
};

export const WithoutTableLine: Story = {
  args: {
    logoUri: DATA_URI_LOGO,
  },
};

export const LongTableLabel: Story = {
  args: {
    logoUri: DATA_URI_LOGO,
    tableLine: 'Meja VIP Lantai Atas Dekat Jendela · Lantai 2',
  },
};

export const WithHistoryButton: Story = {
  args: {
    logoUri: DATA_URI_LOGO,
    tableLine: 'Meja 3 · Lantai 2',
    onHistoryPress: () => {
      // Storybook action stand-in
    },
  },
};
