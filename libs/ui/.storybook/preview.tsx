import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect } from 'react';
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

const withTamagui: Decorator = (Story, context) => {
  const theme = (context.globals['theme'] as 'light' | 'dark') || 'light';

  // Switch theme by toggling Tamagui's CSS classes on the document root.
  // Tamagui injects all theme CSS on mount (scoped to .t_light / .t_dark
  // selectors), so we only need to flip the class — no React re-render or
  // provider remount required. This avoids the "insertBefore" DOM crash that
  // occurs when the Theme context provider re-renders and invalidates portals.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('t_light', 't_dark');
    root.classList.add(`t_${theme}`);
    document.body.style.background = theme === 'dark' ? '#000' : '#fff';
  }, [theme]);

  return (
    // TamaguiProvider is never remounted — it stays stable for the entire
    // Storybook session. Theme switching is handled purely via CSS class
    // manipulation above, keeping React's tree intact.
    <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
      <PortalProvider shouldAddRootHost>
        <Story />
      </PortalProvider>
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
