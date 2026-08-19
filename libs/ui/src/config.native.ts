import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';
import { createAnimations } from '@tamagui/animations-moti';

export const tamaguiConfig = createTamagui({
  ...config,
  animations: createAnimations({
    quicker: {
      type: 'spring',
      damping: 25,
      mass: 1,
      stiffness: 300,
    },
    quick: {
      type: 'spring',
      damping: 18,
      mass: 1,
      stiffness: 200,
    },
    fast: {
      type: 'spring',
      damping: 20,
      mass: 1.2,
      stiffness: 250,
    },
    medium: {
      type: 'spring',
      damping: 10,
      mass: 0.9,
      stiffness: 100,
    },
    lazy: {
      type: 'spring',
      damping: 15,
      mass: 1,
      stiffness: 80,
    },
    slow: {
      type: 'spring',
      damping: 20,
      stiffness: 60,
    },
  }),
});

type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}
}
