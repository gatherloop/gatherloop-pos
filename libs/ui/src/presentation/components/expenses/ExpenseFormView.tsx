import {
  ErrorView,
  Field,
  FieldArray,
  FieldWatch,
  InputNumber,
  InputText,
  LoadingView,
  Select,
} from '../base';
import { Button, Card, Form, H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ExpenseForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type ExpenseFormViewProps = {
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  form: UseFormReturn<ExpenseForm>;
  onSubmit: (values: ExpenseForm) => void;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  onRetryButtonPress: () => void;
};

export const ExpenseFormView = ({
  variant,
  form,
  onSubmit,
  budgetSelectOptions,
  walletSelectOptions,
  isSubmitDisabled,
  onRetryButtonPress,
}: ExpenseFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <YStack gap="$3">
          <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
            <Field name="budgetId" label="Budget Name" flex={1}>
              <Select items={budgetSelectOptions} />
            </Field>
            <Field name="walletId" label="Wallet Name" flex={1}>
              <Select items={walletSelectOptions} />
            </Field>
          </XStack>

          <FieldArray control={form.control} name="expenseItems" keyName="key">
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
                  <Card>
                    <Card.Header>
                      <YStack>
                        <XStack gap="$3" key={index} flexWrap="wrap">
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

          <YStack alignItems="flex-end">
            <Paragraph textAlign="right">Total</Paragraph>
            <FieldWatch control={form.control} name={[`expenseItems`]}>
              {([expenseItems]) => (
                <H3 textAlign="right">
                  Rp.{' '}
                  {expenseItems
                    .reduce((prev, curr) => prev + curr.amount * curr.price, 0)
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
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Expense..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Expense"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
