import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { CameraCapture } from './index';

function stubGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

function stubUnsupportedCamera() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  });
}

function createFakeMediaStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext('2d');

  let hue = 0;
  const draw = () => {
    if (!context) return;
    hue = (hue + 2) % 360;
    context.fillStyle = `hsl(${hue}, 70%, 45%)`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = '28px sans-serif';
    context.fillText('Fake camera feed', 30, canvas.height / 2);
    requestAnimationFrame(draw);
  };
  draw();

  return (
    canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }
  ).captureStream(15);
}

const meta: Meta<typeof CameraCapture> = {
  title: 'Components/Base/CameraCapture',
  component: CameraCapture,
  args: {
    onCapture: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CameraCapture>;

export const Requesting: Story = {
  render: (args) => {
    stubGetUserMedia(() => new Promise<MediaStream>(() => undefined));
    return <CameraCapture {...args} />;
  },
};

export const Live: Story = {
  render: (args) => {
    stubGetUserMedia(() => Promise.resolve(createFakeMediaStream()));
    return <CameraCapture {...args} />;
  },
};

export const Preview: Story = {
  render: (args) => {
    stubGetUserMedia(() => Promise.resolve(createFakeMediaStream()));
    return <CameraCapture {...args} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const shutterButton = await canvas.findByRole('button', { name: 'Ambil foto' });
    await waitFor(() => expect(shutterButton).toBeEnabled());
    await userEvent.click(shutterButton);
    await canvas.findByRole('button', { name: 'Pakai foto ini' });
  },
};

export const Denied: Story = {
  render: (args) => {
    stubGetUserMedia(() => Promise.reject(new Error('Permission denied')));
    return <CameraCapture {...args} />;
  },
};

export const Unsupported: Story = {
  render: (args) => {
    stubUnsupportedCamera();
    return <CameraCapture {...args} />;
  },
};
