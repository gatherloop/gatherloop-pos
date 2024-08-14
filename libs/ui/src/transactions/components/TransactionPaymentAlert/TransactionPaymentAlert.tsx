import { AlertDialog, Button, XStack, YStack } from 'tamagui';
import { useTransactionPaymentAlertState } from './TransactionPaymentAlert.state';
import { FormikProvider } from 'formik';
import { Field, Select, SubmitButton } from '../../../base';

export type TransactionPaymentAlertProps = {
  transactionId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export const TransactionPaymentAlert = ({
  transactionId,
  onSuccess,
  onCancel,
}: TransactionPaymentAlertProps) => {
  const { formik, isSubmitDisabled, wallets } = useTransactionPaymentAlertState(
    {
      transactionId,
      onSuccess,
    }
  );
  return (
    <AlertDialog open onOpenChange={onCancel} modal>
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
          <FormikProvider value={formik}>
            <YStack gap="$3">
              <AlertDialog.Title>Pay Transaction</AlertDialog.Title>
              <AlertDialog.Description>
                Please fill the wallet name and click the yes button
              </AlertDialog.Description>

              <Field name="walletId" label="Wallet Name">
                <Select
                  items={wallets.map(({ id, name }) => ({
                    label: name,
                    value: id,
                  }))}
                  parseFieldToInputValue={JSON.stringify}
                  parseInputToFieldValue={JSON.parse}
                />
              </Field>

              <XStack gap="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button disabled={isSubmitDisabled}>No</Button>
                </AlertDialog.Cancel>
                <SubmitButton theme="active" disabled={isSubmitDisabled}>
                  Yes
                </SubmitButton>
              </XStack>
            </YStack>
          </FormikProvider>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
