import { AlertDialog, Button, XStack, YStack } from 'tamagui';
import { useBudgetDeleteAlertState } from './BudgetDeleteAlert.state';

export type BudgetDeleteAlertProps = {
  budgetId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export const BudgetDeleteAlert = ({
  budgetId,
  onSuccess,
  onCancel,
}: BudgetDeleteAlertProps) => {
  const { onButtonConfirmPress, status } = useBudgetDeleteAlertState({
    budgetId,
    onSuccess,
  });
  return (
    <AlertDialog native open onOpenChange={onCancel} modal>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
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
            <AlertDialog.Title>Delete Budget</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure want to delete the budget ?
            </AlertDialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button disabled={status === 'pending'}>No</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  theme="active"
                  onPress={onButtonConfirmPress}
                  disabled={status === 'pending'}
                >
                  Yes
                </Button>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
