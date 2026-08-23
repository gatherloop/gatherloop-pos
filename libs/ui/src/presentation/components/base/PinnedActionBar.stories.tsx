import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button, Spinner, YStack } from 'tamagui';
import { PinnedActionBar } from './PinnedActionBar';

const meta: Meta<typeof PinnedActionBar> = {
  title: 'Base/PinnedActionBar',
  component: PinnedActionBar,
  decorators: [
    (Story) => (
      <YStack height={200} position="relative" backgroundColor="$gray2">
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PinnedActionBar>;

export const Default: Story = {
  render: () => (
    <PinnedActionBar>
      <Button theme="blue" size="$5" minHeight={44} onPress={fn()}>
        Submit
      </Button>
    </PinnedActionBar>
  ),
};

export const Disabled: Story = {
  render: () => (
    <PinnedActionBar>
      <Button theme="blue" size="$5" minHeight={44} disabled onPress={fn()}>
        Submit
      </Button>
    </PinnedActionBar>
  ),
};

export const Submitting: Story = {
  render: () => (
    <PinnedActionBar>
      <Button
        theme="blue"
        size="$5"
        minHeight={44}
        disabled
        icon={<Spinner />}
        onPress={fn()}
      >
        Submit
      </Button>
    </PinnedActionBar>
  ),
};
