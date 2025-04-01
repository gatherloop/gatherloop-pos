import {
  ErrorView,
  Field,
  FieldArray,
  FieldWatch,
  InputNumber,
  LoadingView,
  Select,
} from '../base';
import { Button, Card, Form, H4, Paragraph, XStack, YStack } from 'tamagui';
import { CalculationForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type CalculationFormViewProps = {
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  form: UseFormReturn<CalculationForm>;
  onSubmit: (values: CalculationForm) => void;
  walletSelectOptions: { label: string; value: number }[];
  getTotalWallet: (totalWallet: number, walletId: number) => number;
  isWalletSelectDisabled?: boolean;
  isSubmitDisabled: boolean;
  onRetryButtonPress: () => void;
};

export const CalculationFormView = ({
  variant,
  form,
  onSubmit,
  walletSelectOptions,
  getTotalWallet,
  isWalletSelectDisabled,
  isSubmitDisabled,
  onRetryButtonPress,
}: CalculationFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <YStack gap="$3">
          <XStack>
            <Field name="walletId" label="Wallet Name" flex={1}>
              <Select
                items={walletSelectOptions}
                disabled={isWalletSelectDisabled}
              />
            </Field>
            <YStack justifyContent="flex-end" flex={1}>
              <Paragraph textAlign="right">Total Wallet</Paragraph>
              <FieldWatch
                control={form.control}
                name={[`totalWallet`, `walletId`]}
              >
                {([totalWallet, walletId]) => (
                  <H4 textAlign="right">
                    Rp.
                    {getTotalWallet(totalWallet, walletId).toLocaleString('id')}
                  </H4>
                )}
              </FieldWatch>
            </YStack>
            <YStack justifyContent="flex-end" flex={1}>
              <Paragraph textAlign="right">Total Calculation</Paragraph>
              <FieldWatch control={form.control} name={[`calculationItems`]}>
                {([calculationItems]) => (
                  <H4 textAlign="right">
                    Rp.
                    {calculationItems
                      .reduce(
                        (prev, curr) => prev + curr.amount * curr.price,
                        0
                      )
                      .toLocaleString('id')}
                  </H4>
                )}
              </FieldWatch>
            </YStack>
          </XStack>

          <FieldArray
            control={form.control}
            name="calculationItems"
            keyName="key"
          >
            {({ fields }) => (
              <>
                {fields.map((field, index) => (
                  <Card>
                    <Card.Header>
                      <YStack>
                        <XStack
                          gap="$5"
                          key={index}
                          flexWrap="wrap"
                          alignItems="center"
                        >
                          <Paragraph textAlign="right">
                            Rp. {field.price.toLocaleString('id')}
                          </Paragraph>
                          <InputNumber
                            name={`calculationItems.${index}.amount`}
                            min={0}
                          />
                          <YStack justifyContent="flex-end" flex={1}>
                            <Paragraph textAlign="right">Subtotal</Paragraph>
                            <FieldWatch
                              control={form.control}
                              name={[
                                `calculationItems.${index}.price`,
                                `calculationItems.${index}.amount`,
                              ]}
                            >
                              {([price, amount]) => (
                                <H4 textAlign="right">
                                  Rp. {(price * amount).toLocaleString('id')}
                                </H4>
                              )}
                            </FieldWatch>
                          </YStack>
                        </XStack>
                      </YStack>
                    </Card.Header>
                  </Card>
                ))}
              </>
            )}
          </FieldArray>
        </YStack>

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Calculation..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Calculation"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
