import { FieldArray, FormikContextType, FormikProvider } from 'formik';
import {
  ErrorView,
  Field,
  Form,
  InputNumber,
  InputText,
  LoadingView,
  Select,
  SubmitButton,
} from '../../../base';

import { Button, Card, H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ExpenseForm } from '../../../../../domain';

export type ExpenseUpdateViewProps = {
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  formik: FormikContextType<ExpenseForm>;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  onRetryButtonPress: () => void;
};

export const ExpenseUpdateView = ({
  variant,
  formik,
  budgetSelectOptions,
  walletSelectOptions,
  isSubmitDisabled,
  onRetryButtonPress,
}: ExpenseUpdateViewProps) => {
  return variant.type === 'loaded' ? (
    <FormikProvider value={formik}>
      <Form>
        <YStack gap="$3">
          <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
            <Field name="budgetId" label="Budget Name" flex={1}>
              <Select
                items={budgetSelectOptions}
                parseFieldToInputValue={JSON.stringify}
                parseInputToFieldValue={JSON.parse}
              />
            </Field>
            <Field name="walletId" label="Wallet Name" flex={1}>
              <Select
                items={walletSelectOptions}
                parseFieldToInputValue={JSON.stringify}
                parseInputToFieldValue={JSON.parse}
              />
            </Field>
          </XStack>

          <FieldArray name="expenseItems">
            {(fieldArray) => (
              <>
                <XStack justifyContent="space-between">
                  <H4>Expense Items</H4>
                  <Button
                    icon={Plus}
                    variant="outlined"
                    circular
                    onPress={() =>
                      fieldArray.push({
                        name: '',
                        unit: '',
                        price: 0,
                        amount: 1,
                      })
                    }
                  />
                </XStack>
                {formik.values.expenseItems.map((item, index) => (
                  <Card>
                    <Card.Header>
                      <YStack>
                        <XStack gap="$3" key={index} flexWrap="wrap">
                          <Field
                            name={`expenseItems[${index}].name`}
                            label="Item Name"
                            flexBasis="22%"
                            $md={{ flexBasis: '45%' }}
                            $xs={{ flexBasis: '100%' }}
                          >
                            <InputText />
                          </Field>
                          <Field
                            name={`expenseItems[${index}].amount`}
                            label="Amount"
                            flexBasis="22%"
                            $md={{ flexBasis: '45%' }}
                            $xs={{ flexBasis: '100%' }}
                          >
                            <InputNumber min={1} />
                          </Field>
                          <Field
                            name={`expenseItems[${index}].unit`}
                            label="Unit"
                            flexBasis="22%"
                            $md={{ flexBasis: '45%' }}
                            $xs={{ flexBasis: '100%' }}
                          >
                            <InputText />
                          </Field>
                          <Field
                            name={`expenseItems[${index}].price`}
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
                            onPress={() => fieldArray.remove(index)}
                            position="absolute"
                            top="$1"
                            right="$1"
                          />
                        </XStack>
                        <YStack justifyContent="flex-end" flex={1}>
                          <Paragraph textAlign="right">Subtotal</Paragraph>
                          <H4 textAlign="right">
                            Rp.{' '}
                            {(item.price * item.amount).toLocaleString('id')}
                          </H4>
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
            <H3 textAlign="right">
              Rp.{' '}
              {formik.values.expenseItems
                .reduce((prev, curr) => prev + curr.amount * curr.price, 0)
                .toLocaleString('id')}
            </H3>
          </YStack>
        </YStack>

        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
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
