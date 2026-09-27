const QR_CANVAS_PADDING = 32;
const QR_CANVAS_TITLE_FONT = 'bold 20px sans-serif';
const QR_CANVAS_AMOUNT_FONT = 'bold 28px sans-serif';
const QR_CANVAS_TITLE_HEIGHT = 28;
const QR_CANVAS_AMOUNT_HEIGHT = 36;
const QR_CANVAS_HEADER_GAP = 12;

export function isQrDownloadSupported(): boolean {
  return (
    typeof document !== 'undefined' && 'download' in document.createElement('a')
  );
}

export function qrImageDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

export type ComposedQrImage = {
  base64: string;
  width: number;
  height: number;
};

export function composeQrDownloadImage(
  qrBase64: string,
  title: string,
  amountLabel: string
): Promise<ComposedQrImage> {
  return new Promise((resolve, reject) => {
    const qrImage = new Image();
    qrImage.onload = () => {
      const width = qrImage.width + QR_CANVAS_PADDING * 2;
      const headerHeight =
        QR_CANVAS_TITLE_HEIGHT + QR_CANVAS_AMOUNT_HEIGHT + QR_CANVAS_HEADER_GAP;
      const height = QR_CANVAS_PADDING * 2 + headerHeight + qrImage.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas 2D context is unavailable'));
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);

      context.fillStyle = '#000000';
      context.textAlign = 'center';
      context.font = QR_CANVAS_TITLE_FONT;
      context.fillText(
        title,
        width / 2,
        QR_CANVAS_PADDING + QR_CANVAS_TITLE_HEIGHT - 8
      );

      context.font = QR_CANVAS_AMOUNT_FONT;
      context.fillText(
        amountLabel,
        width / 2,
        QR_CANVAS_PADDING + QR_CANVAS_TITLE_HEIGHT + QR_CANVAS_AMOUNT_HEIGHT - 8
      );

      context.drawImage(
        qrImage,
        QR_CANVAS_PADDING,
        QR_CANVAS_PADDING + headerHeight,
        qrImage.width,
        qrImage.height
      );

      resolve({
        base64: canvas
          .toDataURL('image/png')
          .replace(/^data:image\/png;base64,/, ''),
        width,
        height,
      });
    };
    qrImage.onerror = () => reject(new Error('Failed to load QR image'));
    qrImage.src = qrImageDataUrl(qrBase64);
  });
}

export function downloadQrImage(base64: string, reference: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `qris-${reference}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);
}
