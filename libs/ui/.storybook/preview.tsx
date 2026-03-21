import type { Preview, Decorator, StoryFn } from '@storybook/react';
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

// StoryHost is defined at module level so its function reference is always
// the same object. It renders the story by CALLING renderFn() as a plain
// function rather than mounting it as a JSX element (<Story />).
//
// Why this matters: Storybook recreates the Story wrapper function on every
// render call (globals change, args change, etc.). When a decorator renders
// <Story /> and Story's reference changes, React sees a new component TYPE
// and fully unmounts the old subtree before mounting the new one. During that
// unmount, Tamagui's portal-based components (Sheet, Dialog, AlertDialog,
// Select, etc.) remove their portal nodes from document.body. React then
// tries to reinsert new portal nodes before the now-missing reference nodes,
// throwing "insertBefore: node is not a child of this node".
//
// By calling renderFn() instead, the story's JSX output is inlined into
// StoryHost's own fiber. React reconciles the JSX in-place across renders —
// no component-type change, no unmount, no portal cleanup race.
//
// key={storyId} forces a clean remount when the user navigates to a
// different story (new component tree, fresh hooks), without affecting
// globals-only updates where storyId stays the same.
const StoryHost: React.FC<{ renderFn: StoryFn; storyId: string }> = ({
  renderFn,
}) => <>{renderFn()}</>;

const withTamagui: Decorator = (Story, context) => {
  const theme = (context.globals['theme'] as 'light' | 'dark') || 'light';

  // Apply theme by toggling Tamagui's root CSS classes. All theme CSS is
  // already injected on mount; this is a pure DOM side-effect with no
  // React re-rendering involved.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('t_light', 't_dark');
    root.classList.add(`t_${theme}`);
    document.body.style.background = theme === 'dark' ? '#000' : '#fff';
  }, [theme]);

  return (
    <TamaguiProvider config={storybookTamaguiConfig} defaultTheme="light">
      <StoryHost
        key={context.id}
        renderFn={Story}
        storyId={context.id}
      />
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
