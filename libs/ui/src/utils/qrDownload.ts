// D23: the guest is paying on the same phone the QR is displayed on, so the
// only path to a working QR is downloading it and paying from the gallery.
// This is DOM-only and web-only (correct — the order app is web-only), but
// it must not assume the DOM at module scope so the component that uses it
// stays importable/testable outside a browser.

export function isQrDownloadSupported(): boolean {
  return (
    typeof document !== 'undefined' && 'download' in document.createElement('a')
  );
}

export function qrImageDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
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
