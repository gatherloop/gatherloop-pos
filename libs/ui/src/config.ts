import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';
import { createAnimations } from '@tamagui/animations-css';

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
