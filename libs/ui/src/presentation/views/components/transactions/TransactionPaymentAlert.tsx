import {
  AlertDialog,
  Button,
  H4,
  Label,
  Paragraph,
  XStack,
  YStack,
} from 'tamagui';
import { Field, InputNumber, Select, useIsCompactLayout } from '../base';
import { useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TransactionPayForm,
  transactionPayFormSchema,
  Wallet,
} from '../../../../domain';

const ALERT_Z_INDEX = 100_001;

export type TransactionPaymentAlertProps = {
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: (values: TransactionPayForm) => void;
  walletSelectOptions: { label: string; value: Wallet }[];
  transactionTotal: number;
  isButtonDisabled: boolean;
};

export const TransactionPaymentAlert = ({
  onSubmit,
  isOpen,
  onCancel,
  walletSelectOptions,
  isButtonDisabled,
  transactionTotal,
}: TransactionPaymentAlertProps) => {
  const isCompactLayout = useIsCompactLayout();

  const form = useForm<TransactionPayForm>({
    defaultValues: { paidAmount: 0 },
    resolver: zodResolver(transactionPayFormSchema(transactionTotal)),
  });

  const isCashless = useWatch({
    control: form.control,
    name: 'wallet.isCashless',
  });
  const paidAmount = useWatch({
    control: form.control,
    name: 'paidAmount',
  });

  useEffect(() => {
    if (isCashless && paidAmount !== transactionTotal) {
      form.setValue('paidAmount', transactionTotal);
    }
  }, [form, isCashless, paidAmount, transactionTotal]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel} modal>
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
          width={isCompactLayout ? '90%' : undefined}
          maxWidth={isCompactLayout ? 420 : undefined}
        >
          <FormProvider {...form}>
            <YStack gap="$5">
              <AlertDialog.Title>Pay Transaction</AlertDialog.Title>
              <AlertDialog.Description>
                Please fill the wallet name and click the yes button
              </AlertDialog.Description>

              <XStack
                gap="$5"
                alignItems={isCompactLayout ? 'stretch' : 'center'}
                flexDirection={isCompactLayout ? 'column' : 'row'}
              >
                {walletSelectOptions.length === 0 ? (
                  <Paragraph
                    color="$red10"
                    flex={isCompactLayout ? undefined : 1}
                  >
                    No wallets are configured to receive payments. Configure one
                    in Wallet Settings.
                  </Paragraph>
                ) : (
                  <Field
                    name="wallet"
                    label="Wallet Name"
                    flex={isCompactLayout ? undefined : 1}
                  >
                    <Select items={walletSelectOptions} />
                  </Field>
                )}

                <YStack gap="$3" flex={isCompactLayout ? undefined : 1}>
                  <Label>Total Amount</Label>
                  <H4>Rp. {transactionTotal.toLocaleString('id')}</H4>
                </YStack>
              </XStack>

              {isCashless === true || isCashless === undefined ? null : (
                <XStack
                  gap="$5"
                  alignItems={isCompactLayout ? 'stretch' : 'center'}
                  flexDirection={isCompactLayout ? 'column' : 'row'}
                >
                  <Field name="paidAmount" label="Paid Amount">
                    <InputNumber
                      step={0}
                      maxWidth={isCompactLayout ? undefined : 150}
                    />
                  </Field>
                  <YStack gap="$3" flex={isCompactLayout ? undefined : 1}>
                    <Label>Change</Label>
                    <H4>
                      Rp. {(paidAmount - transactionTotal).toLocaleString('id')}
                    </H4>
                  </YStack>
                </XStack>
              )}

              <XStack gap="$5" backgroundColor="$backgroundFocus">
                <AlertDialog.Cancel asChild flex={1}>
                  <Button disabled={isButtonDisabled}>Cancel</Button>
                </AlertDialog.Cancel>
                <Button
                  disabled={
                    isButtonDisabled || walletSelectOptions.length === 0
                  }
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
