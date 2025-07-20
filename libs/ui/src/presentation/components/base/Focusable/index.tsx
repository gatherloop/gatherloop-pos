import { KeyboardEvent } from 'react';
import { FocusableProps } from './types';

export const Focusable = (props: FocusableProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && props.onEnterPress) {
      event.preventDefault();
      props.onEnterPress();
    }
  };

  return (
    <div tabIndex={0} onKeyDown={onKeyDown} style={{ flex: 1 }}>
      {props.children}
    </div>
  );
};
