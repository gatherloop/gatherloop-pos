import {
  AlertDialog,
  Button,
  H4,
  Label,
  Paragraph,
  XStack,
  YStack,
} from 'tamagui';
import {
  Field,
  FieldWatch,
  InputNumber,
  Select,
  useIsCompactLayout,
} from '../base';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Wallet } from '../../../domain';

// The compact cart `Sheet` (PRD FR-4) sits at an explicit `zIndex={100_000}`
// and, while it animates closed, can still be in the DOM at the same time
// this alert opens (PRD FR-7 closes it first, but the exit animation is not
// instant). `AlertDialog` otherwise defaults to the same 100_000, so without
// an explicit bump here the two would be one paint order away from the
// alert rendering behind the sheet's overlay.
const ALERT_Z_INDEX = 100_001;

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
  const isCompactLayout = useIsCompactLayout();

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
          // Desktop keeps its intrinsic, unbounded width — this only bounds
          // the dialog on compact so the side-by-side rows below never
          // overflow a phone viewport (PRD FR-7: usable at 390px).
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

              <FieldWatch
                control={form.control}
                name={['wallet.isCashless', 'paidAmount']}
              >
                {([isCashless, paidAmount]) =>
                  isCashless === true || isCashless === undefined ? null : (
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
