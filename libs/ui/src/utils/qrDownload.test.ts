import {
  downloadQrImage,
  isQrDownloadSupported,
  qrImageDataUrl,
} from './qrDownload';

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
