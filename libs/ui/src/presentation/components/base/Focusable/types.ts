import { ReactNode } from 'react';
import { YStackProps } from 'tamagui';

export type FocusableProps = YStackProps & {
  children: ReactNode;
  onEnterPress?: () => void;
};
