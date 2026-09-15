import { AlertDialog, Button, XStack, YStack } from 'tamagui';
import { TransactionCompleteActionType } from '../../../../domain';

export type TransactionCompleteAlertProps = {
  isOpen: boolean;
  action: TransactionCompleteActionType | null;
  isButtonDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const copyByAction: Record<
  TransactionCompleteActionType,
  { title: string; description: string }
> = {
  complete: {
    title: 'Mark as Ready',
    description: 'Are you sure want to mark this order as ready ?',
  },
  uncomplete: {
    title: 'Mark as Preparing',
    description: 'Are you sure want to mark this order as preparing again ?',
  },
};

export const TransactionCompleteAlert = ({
  isOpen,
  action,
  isButtonDisabled,
  onCancel,
  onConfirm,
}: TransactionCompleteAlertProps) => {
  const { title, description } = copyByAction[action ?? 'complete'];

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
          <YStack gap="$5">
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description>{description}</AlertDialog.Description>

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
