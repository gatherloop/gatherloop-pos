import { FocusableProps } from './types';
import { YStack } from 'tamagui';

export const Focusable = (props: FocusableProps) => {
  return <YStack flex={1}>{props.children}</YStack>;
};
