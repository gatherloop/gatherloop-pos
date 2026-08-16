import React from 'react';

// react-native-svg pulls in the real react-native package for its Touchable
// mixin, which the project's react-native mock (src/__mocks__/react-native.ts)
// does not provide. QR rendering has no logic worth testing under jsdom, so
// the whole package is swapped for a stub that just proves it was invoked.
const QRCode = ({ value }: { value: string; size?: number }) =>
  React.createElement('div', { 'data-testid': 'qr-code', 'data-value': value });

export default QRCode;
