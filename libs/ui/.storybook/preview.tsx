import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import { TamaguiProvider, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';
import { createAnimations } from '@tamagui/animations-css';
import { addons } from '@storybook/preview-api';

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

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('t_light', 't_dark');
  root.classList.add(`t_${theme}`);
  document.body.style.background = theme === 'dark' ? '#000' : '#fff';
}

// Set the initial theme class on the document root.
applyTheme('light');

// Listen for globals changes on the Storybook channel and apply the theme
// purely via CSS class manipulation — completely outside of React's rendering
// cycle. This is the critical fix: because the decorator below does NOT read
// context.globals, Storybook will not trigger a story re-render when the
// theme global changes. No re-render = no new Story function reference =
// no React unmount/remount = no insertBefore crash from portal cleanup.
addons.getChannel().on('storybook/globals/globals-updated', ({ globals }: { globals: Record<string, unknown> }) => {
  applyTheme((globals['theme'] as 'light' | 'dark') || 'light');
});

// Decorator is intentionally stable: it does NOT read from context.globals.
// Theme switching is handled by the channel listener above.
const withTamagui: Decorator = (Story) => (
  <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
    <Story />
  </TamaguiProvider>
);

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
