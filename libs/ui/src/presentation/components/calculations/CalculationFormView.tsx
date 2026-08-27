import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldArray,
  FieldWatch,
  FormErrorBanner,
  FormVariant,
  FormView,
  InputNumber,
  Select,
} from '../base';
import { Button, Card, H4, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { CalculationForm, calculationFormSchema } from '../../../domain';
import { getCalculationStatus } from './utils';

const calculationFormResolver = zodResolver(
  calculationFormSchema,
  {},
  { raw: true }
);

export type CalculationFormViewProps = {
  variant: FormVariant;
  defaultValues: CalculationForm;
  onSubmit: (values: CalculationForm) => void;
  walletSelectOptions: { label: string; value: number }[];
  getTotalWallet: (totalWallet: number, walletId: number) => number;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isFormDisabled?: boolean;
  serverError?: string;
};

export const CalculationFormView = (props: CalculationFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={calculationFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Calculation..."
    errorTitle="Failed to Fetch Calculation"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <YStack gap="$3">
          <XStack flexWrap="wrap" gap="$3">
            <Field name="walletId" label="Wallet Name" flex={1}>
              <Select
                items={props.walletSelectOptions}
                disabled={props.isFormDisabled}
              />
            </Field>
            <YStack justifyContent="flex-end" flex={1}>
              <Paragraph textAlign="right">Status</Paragraph>
              <FieldWatch
                control={form.control}
                name={[`totalWallet`, `walletId`, `calculationItems`]}
              >
                {([totalWallet, walletId, calculationItems]) => (
                  <H4 textAlign="right">
                    {getCalculationStatus({
                      totalCalculation: calculationItems.reduce(
                        (prev, curr) => prev + curr.amount * curr.price,
                        0
                      ),
                      totalWallet: props.getTotalWallet(totalWallet, walletId),
                    })}
                  </H4>
                )}
              </FieldWatch>
            </YStack>
            <YStack justifyContent="flex-end" flex={1}>
              <Paragraph textAlign="right">Total Wallet</Paragraph>
              <FieldWatch
                control={form.control}
                name={[`totalWallet`, `walletId`]}
              >
                {([totalWallet, walletId]) => (
                  <H4 textAlign="right">
                    Rp.
                    {props
                      .getTotalWallet(totalWallet, walletId)
                      .toLocaleString('id')}
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
                  <Card key={index}>
                    <Card.Header>
                      <YStack>
                        <XStack
                          gap="$5"
                          flexWrap="wrap"
                          alignItems="center"
                        >
                          <Paragraph textAlign="right">
                            Rp. {field.price.toLocaleString('id')}
                          </Paragraph>
                          <InputNumber
                            name={`calculationItems.${index}.amount`}
                            min={0}
                            disabled={props.isFormDisabled}
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
          disabled={props.isSubmitDisabled || props.isFormDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
