import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CodPhotoCaptureSheet } from './CodPhotoCaptureSheet';

function stubGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

const meta: Meta<typeof CodPhotoCaptureSheet> = {
  title: 'Components/Checkout/CodPhotoCaptureSheet',
  component: CodPhotoCaptureSheet,
  args: {
    isOpen: true,
    onCapturePhoto: fn(),
    onBackPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CodPhotoCaptureSheet>;

export const Requesting: Story = {
  render: (args) => {
    stubGetUserMedia(() => new Promise<MediaStream>(() => undefined));
    return <CodPhotoCaptureSheet {...args} />;
  },
};

export const Closed: Story = {
  args: { isOpen: false },
};
