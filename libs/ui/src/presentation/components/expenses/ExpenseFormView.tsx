import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldWatch,
  FormErrorBanner,
  FormVariant,
  FormView,
  InputNumber,
  InputText,
  Select,
} from '../base';
import {
  Button,
  Card,
  H3,
  H4,
  Paragraph,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ExpenseForm, expenseFormSchema } from '../../../domain';
import { zodResolver } from '@hookform/resolvers/zod';

const expenseFormResolver = zodResolver(expenseFormSchema, {}, { raw: true });

export type ExpenseFormViewProps = {
  variant: FormVariant;
  defaultValues: ExpenseForm;
  onSubmit: (values: ExpenseForm) => void;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const ExpenseFormView = ({
  variant,
  defaultValues,
  onSubmit,
  budgetSelectOptions,
  walletSelectOptions,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: ExpenseFormViewProps) => {
  return (
    <FormView
      variant={variant}
      defaultValues={defaultValues}
      resolver={expenseFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Fetching Expense..."
      errorTitle="Failed to Fetch Expense"
    >
      {(form) => (
        <>
          <FormErrorBanner message={serverError} />
          <YStack gap="$3">
            <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
              <Field name="budgetId" label="Budget Name" flex={1}>
                <Select items={budgetSelectOptions} />
              </Field>
              <Field name="walletId" label="Wallet Name" flex={1}>
                <Select items={walletSelectOptions} />
              </Field>
            </XStack>

            <FieldArray
              control={form.control}
              name="expenseItems"
              keyName="key"
            >
              {({ append, fields, remove }) => (
                <>
                  <XStack justifyContent="space-between">
                    <H4>Expense Items</H4>
                    <Button
                      icon={Plus}
                      variant="outlined"
                      circular
                      onPress={() =>
                        append({
                          name: '',
                          unit: '',
                          price: 0,
                          amount: 1,
                        })
                      }
                    />
                  </XStack>
                  {fields.map((_, index) => (
                    <Card key={index}>
                      <Card.Header>
                        <YStack>
                          <XStack gap="$3" flexWrap="wrap">
                            <Field
                              name={`expenseItems.${index}.name`}
                              label="Item Name"
                              flexBasis="22%"
                              $md={{ flexBasis: '45%' }}
                              $xs={{ flexBasis: '100%' }}
                            >
                              <InputText />
                            </Field>
                            <Field
                              name={`expenseItems.${index}.amount`}
                              label="Amount"
                              flexBasis="22%"
                              $md={{ flexBasis: '45%' }}
                              $xs={{ flexBasis: '100%' }}
                            >
                              <InputNumber min={1} />
                            </Field>
                            <Field
                              name={`expenseItems.${index}.unit`}
                              label="Unit"
                              flexBasis="22%"
                              $md={{ flexBasis: '45%' }}
                              $xs={{ flexBasis: '100%' }}
                            >
                              <InputText />
                            </Field>
                            <Field
                              name={`expenseItems.${index}.price`}
                              label="Price"
                              flexBasis="22%"
                              $md={{ flexBasis: '45%' }}
                              $xs={{ flexBasis: '100%' }}
                            >
                              <InputNumber min={0} />
                            </Field>

                            <Button
                              size="$2"
                              icon={Trash}
                              circular
                              theme="red"
                              color="$red8"
                              onPress={() => remove(index)}
                              position="absolute"
                              top="$1"
                              right="$1"
                            />
                          </XStack>
                          <YStack justifyContent="flex-end" flex={1}>
                            <Paragraph textAlign="right">Subtotal</Paragraph>

                            <FieldWatch
                              control={form.control}
                              name={[
                                `expenseItems.${index}.price`,
                                `expenseItems.${index}.amount`,
                              ]}
                            >
                              {([price, amount]) => (
                                <H4 textAlign="right">
                                  Rp. {(price * amount).toLocaleString('id')}
                                </H4>
                              )}
                            </FieldWatch>
                          </YStack>
                        </YStack>
                      </Card.Header>
                    </Card>
                  ))}
                </>
              )}
            </FieldArray>
            <ErrorMessage name="expenseItems" />

            <YStack alignItems="flex-end">
              <Paragraph textAlign="right">Total</Paragraph>
              <FieldWatch control={form.control} name={[`expenseItems`]}>
                {([expenseItems]) => (
                  <H3 textAlign="right">
                    Rp.{' '}
                    {expenseItems
                      .reduce(
                        (prev, curr) => prev + curr.amount * curr.price,
                        0,
                      )
                      .toLocaleString('id')}
                  </H3>
                )}
              </FieldWatch>
            </YStack>
          </YStack>

          <Button
            disabled={isSubmitDisabled}
            onPress={form.handleSubmit(onSubmit)}
            theme="blue"
            icon={isSubmitting ? <Spinner /> : undefined}
          >
            Submit
          </Button>
        </>
      )}
    </FormView>
  );
};
