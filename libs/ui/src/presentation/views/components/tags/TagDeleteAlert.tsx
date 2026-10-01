import { AlertDialog, Button, Spinner, XStack, YStack } from 'tamagui';

export type TagDeleteAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isButtonDisabled: boolean;
  variantCount?: number;
};

export const TagDeleteAlert = ({
  isOpen,
  onCancel,
  onConfirm,
  isButtonDisabled,
  variantCount = 0,
}: TagDeleteAlertProps) => {
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
            <AlertDialog.Title>Delete Tag ?</AlertDialog.Title>
            <AlertDialog.Description>
              {variantCount > 0
                ? `This tag is applied to ${variantCount} ${
                    variantCount === 1 ? 'variant' : 'variants'
                  }. Deleting it removes the tag and its assignments. Are you sure ?`
                : 'Are you sure want to delete it ?'}
            </AlertDialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button disabled={isButtonDisabled}>No</Button>
              </AlertDialog.Cancel>
              <Button
                theme="active"
                onPress={onConfirm}
                disabled={isButtonDisabled}
                icon={isButtonDisabled ? <Spinner /> : undefined}
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
