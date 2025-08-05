import { AlertDialog, Button, H4, Label, XStack, YStack } from 'tamagui';
import { Field, FieldWatch, InputNumber, Select } from '../base';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Wallet } from '../../../domain';

export type TransactionPaymentAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  form: UseFormReturn<{ wallet: Wallet; paidAmount: number }>;
  onSubmit: (values: { wallet: Wallet; paidAmount: number }) => void;
  walletSelectOptions: { label: string; value: Wallet }[];
  transactionTotal: number;
  isButtonDisabled: boolean;
};

export const TransactionPaymentAlert = ({
  form,
  onSubmit,
  isOpen,
  onCancel,
  walletSelectOptions,
  isButtonDisabled,
  transactionTotal,
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
            <YStack gap="$5">
              <AlertDialog.Title>Pay Transaction</AlertDialog.Title>
              <AlertDialog.Description>
                Please fill the wallet name and click the yes button
              </AlertDialog.Description>

              <XStack gap="$5" alignItems="center">
                <Field name="wallet" label="Wallet Name" flex={1}>
                  <Select items={walletSelectOptions} />
                </Field>

                <YStack gap="$3" flex={1}>
                  <Label>Total Amount</Label>
                  <H4>Rp. {transactionTotal.toLocaleString('id')}</H4>
                </YStack>
              </XStack>

              <FieldWatch
                control={form.control}
                name={['wallet.isCashless', 'paidAmount']}
              >
                {([isCashless, paidAmount]) =>
                  isCashless === true || isCashless === undefined ? null : (
                    <XStack gap="$5" alignItems="center">
                      <Field name="paidAmount" label="Paid Amount">
                        <InputNumber step={0} maxWidth={150} />
                      </Field>
                      <YStack gap="$3" flex={1}>
                        <Label>Change</Label>
                        <H4>
                          Rp.{' '}
                          {(paidAmount - transactionTotal).toLocaleString('id')}
                        </H4>
                      </YStack>
                    </XStack>
                  )
                }
              </FieldWatch>

              <XStack gap="$5" backgroundColor="$backgroundFocus">
                <AlertDialog.Cancel asChild flex={1}>
                  <Button disabled={isButtonDisabled}>Cancel</Button>
                </AlertDialog.Cancel>
                <Button
                  disabled={isButtonDisabled}
                  onPress={form.handleSubmit(onSubmit)}
                  theme="active"
                  flex={1}
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
