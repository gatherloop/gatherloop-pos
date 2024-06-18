import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

export const tamaguiConfig = createTamagui(config);

type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}
}
