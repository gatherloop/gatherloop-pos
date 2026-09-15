import type { Meta, StoryObj } from '@storybook/react';
import { ResumeOrderBanner } from './ResumeOrderBanner';

const meta: Meta<typeof ResumeOrderBanner> = {
  title: 'Components/Menu/ResumeOrderBanner',
  component: ResumeOrderBanner,
  args: {
    onPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResumeOrderBanner>;

export const Default: Story = {};
