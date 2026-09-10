import React from 'react';

const QRCode = ({ value }: { value: string; size?: number }) =>
  React.createElement('div', { 'data-testid': 'qr-code', 'data-value': value });

export default QRCode;
