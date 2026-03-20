import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import { PortalProvider, TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../src/config';

const withTamagui: Decorator = (Story) => (
  <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
    <PortalProvider shouldAddRootHost>
      <Story />
    </PortalProvider>
  </TamaguiProvider>
);

const preview: Preview = {
  decorators: [withTamagui],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
      },
    },
  },
};

export default preview;
