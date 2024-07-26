import { ReactNode } from 'react';
import { Sheet as TamaguiSheet } from 'tamagui';

export type SheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: ReactNode;
};

export const Sheet = ({ isOpen, onOpenChange, children }: SheetProps) => {
  return (
    <TamaguiSheet
      forceRemoveScrollEnabled={true}
      modal={true}
      open={isOpen}
      onOpenChange={onOpenChange}
      zIndex={100_000}
      animation="medium"
      position={0}
      unmountChildrenWhenHidden
    >
      <TamaguiSheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <TamaguiSheet.Handle />
      <TamaguiSheet.Frame>{children}</TamaguiSheet.Frame>
    </TamaguiSheet>
  );
};
