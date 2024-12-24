import { AlertDialog, Button, XStack, YStack } from 'tamagui';
import { Field, Select } from '../base';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type TransactionPaymentAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  form: UseFormReturn<{ walletId: number }>;
  onSubmit: (walletId: { walletId: number }) => void;
  walletSelectOptions: { label: string; value: number }[];
  isButtonDisabled: boolean;
};

export const TransactionPaymentAlert = ({
  form,
  onSubmit,
  isOpen,
  onCancel,
  walletSelectOptions,
  isButtonDisabled,
}: TransactionPaymentAlertProps) => {
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
          <FormProvider {...form}>
            <YStack gap="$3">
              <AlertDialog.Title>Pay Transaction</AlertDialog.Title>
              <AlertDialog.Description>
                Please fill the wallet name and click the yes button
              </AlertDialog.Description>

              <Field name="walletId" label="Wallet Name">
                <Select items={walletSelectOptions} />
              </Field>

              <XStack gap="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button disabled={isButtonDisabled}>No</Button>
                </AlertDialog.Cancel>
                <Button
                  disabled={isButtonDisabled}
                  onPress={form.handleSubmit(onSubmit)}
                  theme="active"
                >
                  Submit
                </Button>
              </XStack>
            </YStack>
          </FormProvider>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
