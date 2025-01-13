import { FocusableProps } from './types';
import { YStack } from 'tamagui';

export const Focusable = (props: FocusableProps) => {
  return <YStack>{props.children}</YStack>;
};
