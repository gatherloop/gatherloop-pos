import { AlertDialog, Button, XStack, YStack } from 'tamagui';
import { FormikContextType, FormikProvider } from 'formik';
import { Field, Select, SubmitButton } from '../../../base';

export type TransactionPaymentAlertViewProps = {
  isOpen: boolean;
  onCancel: () => void;
  formik: FormikContextType<{ walletId: number }>;
  walletSelectOptions: { label: string; value: number }[];
  isButtonDisabled: boolean;
};

export const TransactionPaymentAlertView = ({
  formik,
  isOpen,
  onCancel,
  walletSelectOptions,
  isButtonDisabled,
}: TransactionPaymentAlertViewProps) => {
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
          <FormikProvider value={formik}>
            <YStack gap="$3">
              <AlertDialog.Title>Pay Transaction</AlertDialog.Title>
              <AlertDialog.Description>
                Please fill the wallet name and click the yes button
              </AlertDialog.Description>

              <Field name="walletId" label="Wallet Name">
                <Select
                  items={walletSelectOptions}
                  parseFieldToInputValue={JSON.stringify}
                  parseInputToFieldValue={JSON.parse}
                />
              </Field>

              <XStack gap="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button disabled={isButtonDisabled}>No</Button>
                </AlertDialog.Cancel>
                <SubmitButton theme="active" disabled={isButtonDisabled}>
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
