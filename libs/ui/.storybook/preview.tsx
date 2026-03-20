import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import { PortalProvider, TamaguiProvider, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';
import { createAnimations } from '@tamagui/animations-css';

// Use CSS-based animations in Storybook instead of @tamagui/animations-moti.
// The moti driver relies on react-native-reanimated which, even when mocked,
// produces style objects with numeric indexed keys that cause a
// "Indexed property setter is not supported" error in CSSStyleDeclaration.
// CSS animations (transitions) are the correct driver for web/Storybook.
const storybookTamaguiConfig = createTamagui({
  ...config,
  animations: createAnimations({
    fast: 'ease-in 150ms',
    medium: 'ease-in 300ms',
    slow: 'ease-in 450ms',
  }),
});

const withTamagui: Decorator = (Story) => (
  <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
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
