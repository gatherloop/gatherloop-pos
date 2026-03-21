import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect } from 'react';
import { PortalProvider, TamaguiProvider, Theme, createTamagui } from 'tamagui';
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

const withTamagui: Decorator = (Story, context) => {
  const theme = (context.globals['theme'] as 'light' | 'dark') || 'light';

  // Sync the document background so the Storybook canvas matches the theme.
  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#000' : '#fff';
    return () => {
      document.body.style.background = '';
    };
  }, [theme]);

  return (
    // TamaguiProvider is intentionally kept stable (no key prop) because it
    // injects CSS for ALL themes on mount. Remounting it on every toggle
    // causes React DOM reconciliation errors ("insertBefore" NotFoundError).
    // The Theme component alone is sufficient to switch the active theme.
    <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
      <Theme name={theme}>
        <PortalProvider shouldAddRootHost>
          <Story />
        </PortalProvider>
      </Theme>
    </TamaguiProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
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
