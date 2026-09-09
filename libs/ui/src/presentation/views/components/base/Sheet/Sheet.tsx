import { ReactNode } from 'react';
import { Sheet as TamaguiSheet } from 'tamagui';
import { useWebVisualViewportHeight } from './useWebVisualViewportHeight';

export type SheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: ReactNode;
};

export const Sheet = ({ isOpen, onOpenChange, children }: SheetProps) => {
  // Keeps a focused input (and a pinned footer below it) reachable above the
  // software keyboard: `moveOnKeyboardChange` shrinks the frame by the
  // keyboard height on native, and `useWebVisualViewportHeight` caps it to
  // the space the on-screen keyboard actually leaves on web, where the
  // library's own keyboard handling is a no-op (PRD "rental checkin mobile"
  // Phase 4).
  const webVisualViewportHeight = useWebVisualViewportHeight();

  return (
    <TamaguiSheet
      modal={true}
      open={isOpen}
      onOpenChange={onOpenChange}
      zIndex={100_000}
      animation="medium"
      position={0}
      unmountChildrenWhenHidden
      disableDrag
      snapPoints={[90, 0]}
      moveOnKeyboardChange
    >
      <TamaguiSheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <TamaguiSheet.Handle />
      <TamaguiSheet.Frame height={webVisualViewportHeight ?? '100vh'}>
        {children}
      </TamaguiSheet.Frame>
    </TamaguiSheet>
  );
};
