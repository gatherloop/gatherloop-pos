import { ReactNode } from 'react';

export type FocusableProps = {
  children: ReactNode;
  onEnterPress?: () => void;
};
