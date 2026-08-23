import { AlertDialog, Button, ScrollView, XStack, YStack } from 'tamagui';
import { useWindowDimensions } from 'react-native';
import { useIsCompactLayout } from '../useIsCompactLayout';

export type ConfirmationAlertProps = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isOpen: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onOpenChange: (isOpen: boolean) => void;
};

// The compact cart `Sheet` sits at an explicit `zIndex={100_000}` and, while
// it animates closed, can still be in the DOM at the same time a
// confirmation opens on top of it (e.g. checkin's print prompt, shown right
// after the cart sheet closes on submit success). `AlertDialog` otherwise
// defaults to that same 100_000, so without an explicit bump here the two
// are one paint order away from the alert rendering behind the sheet's
// overlay (PRD "rental checkin mobile" FR-5, following
// `TransactionPaymentAlert`'s precedent).
const ALERT_Z_INDEX = 100_001;

export const ConfirmationAlert = ({
  title,
  description,
  isOpen,
  onCancel,
  onConfirm,
  confirmText = 'Yes',
  cancelText = 'No',
  onOpenChange,
}: ConfirmationAlertProps) => {
  const isCompactLayout = useIsCompactLayout();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange} modal>
      <AlertDialog.Portal zIndex={ALERT_Z_INDEX}>
        <AlertDialog.Overlay
          key="overlay"
          animation="fast"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
          // Desktop keeps its intrinsic, unbounded size — this only bounds
          // the dialog on compact so the Yes/No row is always reachable at
          // 360-430px instead of being pushed off-screen by a long
          // title/description (PRD FR-5).
          width={isCompactLayout ? '90%' : undefined}
          maxWidth={isCompactLayout ? 420 : undefined}
          maxHeight={isCompactLayout ? '85%' : undefined}
        >
          <YStack gap="$3">
            {isCompactLayout ? (
              // Bound to a fraction of the actual window height (not the
              // dialog's own percentage-based maxHeight, which Yoga can't
              // redistribute into a flex child the way browser CSS does —
              // same reasoning as the variant dialog in
              // `TransactionItemSelect`) so the Yes/No row below always has
              // room left under it.
              <ScrollView maxHeight={windowHeight * 0.5}>
                <YStack gap="$3">
                  <AlertDialog.Title>{title}</AlertDialog.Title>
                  <AlertDialog.Description>
                    {description}
                  </AlertDialog.Description>
                </YStack>
              </ScrollView>
            ) : (
              <>
                <AlertDialog.Title>{title}</AlertDialog.Title>
                <AlertDialog.Description>{description}</AlertDialog.Description>
              </>
            )}

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button onPress={onCancel}>{cancelText}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button theme="active" onPress={onConfirm}>
                  {confirmText}
                </Button>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
