import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';
import { createAnimations } from '@tamagui/animations-css';

// Web build of the shared Tamagui config (see config.native.ts for the
// React Native / Moti build — Metro resolves `.native.ts` over this file
// automatically, while webpack resolves this plain `.ts` file for
// apps/web and apps/order). @tamagui/animations-moti resolves an animated
// view's `style` to an array (base + enter-variant) rather than a merged
// object; react-dom then does `element.style[0] = ...`, which crashes with
// "Indexed property setter is not supported" the first time any animated
// component (e.g. the product-detail Sheet) mounts in a session. CSS
// transitions are the correct driver on web — this mirrors the fix already
// applied to Storybook in .storybook/preview.tsx.
export const tamaguiConfig = createTamagui({
  ...config,
  animations: createAnimations({
    quicker: 'ease-in 100ms',
    quick: 'ease-in 200ms',
    fast: 'ease-in 150ms',
    medium: 'ease-in 300ms',
    lazy: 'ease-in 350ms',
    slow: 'ease-in 450ms',
  }),
});

type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}
}
