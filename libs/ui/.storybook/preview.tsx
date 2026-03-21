import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect } from 'react';
import { TamaguiProvider, createTamagui } from 'tamagui';
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
    //
    // PortalProvider is intentionally omitted: Storybook provides a new
    // Story reference on every globals update, causing React to unmount and
    // remount the story subtree. PortalProvider with shouldAddRootHost
    // creates DOM nodes outside #storybook-root; when those portal nodes are
    // cleaned up during the unmount/remount cycle, React's insertBefore
    // call fails with a NotFoundError. Without PortalProvider, Tamagui
    // portal-based components (Sheet, Dialog, AlertDialog, etc.) fall back
    // to rendering into document.body, which is always stable.
    <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
      <Story />
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
