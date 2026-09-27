import {
  composeQrDownloadImage,
  downloadQrImage,
  isQrDownloadSupported,
  qrImageDataUrl,
} from './qrDownload';

class FakeImage {
  width = 220;
  height = 220;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private currentSrc = '';

  set src(value: string) {
    this.currentSrc = value;
    this.onload?.();
  }

  get src() {
    return this.currentSrc;
  }
}

describe('isQrDownloadSupported', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is true when a created anchor exposes a download property', () => {
    expect(isQrDownloadSupported()).toBe(true);
  });

  it('is false when a created anchor has no download property (older iOS Safari)', () => {
    jest.spyOn(document, 'createElement').mockReturnValue({} as HTMLAnchorElement);

    expect(isQrDownloadSupported()).toBe(false);
  });
});

describe('qrImageDataUrl', () => {
  it('wraps the base64 payload as a PNG data URL', () => {
    expect(qrImageDataUrl('abc123')).toBe('data:image/png;base64,abc123');
  });
});

describe('composeQrDownloadImage', () => {
  const originalImage = global.Image;

  beforeEach(() => {
    global.Image = FakeImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      fillRect: jest.fn(),
      fillText: jest.fn(),
      drawImage: jest.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = jest
      .fn()
      .mockReturnValue('data:image/png;base64,composed') as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
  });

  afterEach(() => {
    global.Image = originalImage;
    jest.restoreAllMocks();
  });

  it('draws a white canvas padded around the QR with the title and amount on top, sized to the QR plus padding', async () => {
    const composed = await composeQrDownloadImage(
      btoa('hello'),
      'Gatherloop Board Game Cafe',
      'Rp 36.000'
    );

    expect(composed.base64).toBe('composed');
    expect(composed.width).toBe(220 + 32 * 2);
    expect(composed.height).toBe(220 + 32 * 2 + 28 + 36 + 12);
  });

  it('rejects when the QR image fails to load', async () => {
    class FailingImage extends FakeImage {
      set src(_value: string) {
        this.onerror?.();
      }
    }
    global.Image = FailingImage as unknown as typeof Image;

    await expect(
      composeQrDownloadImage(btoa('hello'), 'title', 'amount')
    ).rejects.toThrow('Failed to load QR image');
  });
});

describe('downloadQrImage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('converts the base64 payload into a PNG blob and clicks a download link named after the reference', () => {
    const objectUrl = 'blob:mock-url';
    const createObjectURL = jest.fn().mockReturnValue(objectUrl);
    const revokeObjectURL = jest.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');

    downloadQrImage(btoa('hello'), 'ORD0000000000001');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe('hello'.length);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe('qris-ORD0000000000001.png');
    expect(link.href).toBe(objectUrl);

    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });
});
