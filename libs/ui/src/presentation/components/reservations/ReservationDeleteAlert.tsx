import { AlertDialog, Button, XStack, YStack } from 'tamagui';

export type ReservationDeleteAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  isButtonDisabled: boolean;
  onButtonConfirmPress: () => void;
};

export const ReservationDeleteAlert = ({
  isButtonDisabled,
  isOpen,
  onButtonConfirmPress,
  onCancel,
}: ReservationDeleteAlertProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel} modal>
      <AlertDialog.Portal>
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
        >
          <YStack gap="$3">
            <AlertDialog.Title>Delete Reservation</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure want to delete it ?
            </AlertDialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button disabled={isButtonDisabled}>No</Button>
              </AlertDialog.Cancel>
              <Button
                theme="active"
                onPress={onButtonConfirmPress}
                disabled={isButtonDisabled}
              >
                Yes
              </Button>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
