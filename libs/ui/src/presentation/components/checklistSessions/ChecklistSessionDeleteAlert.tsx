import { AlertDialog, Button, XStack, YStack } from 'tamagui';

export type ChecklistSessionDeleteAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isButtonDisabled: boolean;
};

export const ChecklistSessionDeleteAlert = ({
  isOpen,
  onCancel,
  onConfirm,
  isButtonDisabled,
}: ChecklistSessionDeleteAlertProps) => {
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
            <AlertDialog.Title>Delete Checklist Session?</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete this checklist session? This action
              cannot be undone.
            </AlertDialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button disabled={isButtonDisabled}>No</Button>
              </AlertDialog.Cancel>
              <Button
                theme="active"
                onPress={onConfirm}
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
