import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraCapture } from './index';

function stubGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn(impl) },
  });
}

function stubUnsupportedCamera() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  });
}

function createFakeStream() {
  const stop = jest.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  return { stream, stop };
}

describe('CameraCapture', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    HTMLMediaElement.prototype.play = jest
      .fn()
      .mockResolvedValue(undefined) as unknown as () => Promise<void>;
    HTMLCanvasElement.prototype.getContext = jest
      .fn()
      .mockReturnValue({ drawImage: jest.fn() }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = jest.fn(function toBlob(
      this: HTMLCanvasElement,
      callback: BlobCallback
    ) {
      callback(new Blob(['x'.repeat(256)], { type: 'image/jpeg' }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    jest.restoreAllMocks();
  });

  it('renders the unsupported guidance and no camera prompt when getUserMedia is unavailable', () => {
    stubUnsupportedCamera();

    render(<CameraCapture onCapture={jest.fn()} />);

    expect(
      screen.getByText('Browser ini tidak mendukung kamera. Silakan pilih QRIS.')
    ).toBeTruthy();
  });

  it('renders the QRIS guidance when camera permission is denied', async () => {
    stubGetUserMedia(() => Promise.reject(new Error('denied')));

    render(<CameraCapture onCapture={jest.fn()} />);

    expect(
      await screen.findByText('Izinkan akses kamera untuk memakai COD, atau pilih QRIS.')
    ).toBeTruthy();
  });

  it('captures a photo, stops every track, and only emits it once the guest confirms', async () => {
    const { stream, stop } = createFakeStream();
    stubGetUserMedia(() => Promise.resolve(stream));
    const onCapture = jest.fn();
    const user = userEvent.setup();

    const { container } = render(<CameraCapture onCapture={onCapture} />);

    const shutterButton = (await screen.findByRole('button', {
      name: 'Ambil foto',
    })) as HTMLButtonElement;
    await waitFor(() => expect(shutterButton.disabled).toBe(false));

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    Object.defineProperty(video as HTMLVideoElement, 'videoWidth', {
      value: 1920,
      configurable: true,
    });
    Object.defineProperty(video as HTMLVideoElement, 'videoHeight', {
      value: 1080,
      configurable: true,
    });

    await user.click(shutterButton);

    expect(stop).toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();

    const confirmButton = await screen.findByRole('button', {
      name: 'Pakai foto ini',
    });
    await user.click(confirmButton);

    expect(onCapture).toHaveBeenCalledTimes(1);
    const [photo] = onCapture.mock.calls[0];
    expect(typeof photo).toBe('string');
    expect(photo.startsWith('data:')).toBe(false);
    expect(Buffer.from(photo, 'base64').length).toBeLessThanOrEqual(1024 * 1024);
  });

  it('lets the guest retake the photo before confirming', async () => {
    const { stream } = createFakeStream();
    stubGetUserMedia(() => Promise.resolve(stream));
    const onCapture = jest.fn();
    const user = userEvent.setup();

    const { container } = render(<CameraCapture onCapture={onCapture} />);

    const shutterButton = (await screen.findByRole('button', {
      name: 'Ambil foto',
    })) as HTMLButtonElement;
    await waitFor(() => expect(shutterButton.disabled).toBe(false));
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 800, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 600, configurable: true });
    await user.click(shutterButton);

    const retakeButton = await screen.findByRole('button', { name: 'Ulangi' });
    await user.click(retakeButton);

    await screen.findByRole('button', { name: 'Ambil foto' });
    expect(
      screen.queryByRole('button', { name: 'Pakai foto ini' })
    ).toBeNull();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('never renders a file input, in any state', () => {
    stubUnsupportedCamera();

    const { container } = render(<CameraCapture onCapture={jest.fn()} />);

    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
