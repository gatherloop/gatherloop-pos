import { FieldArray, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputNumber,
  InputText,
  Select,
  SubmitButton,
} from '../../../base';
import {
  UseExpenseFormStateProps,
  useExpenseFormState,
} from './ExpenseForm.state';
import { Button, Card, H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';

export type ExpenseFormProps = {
  variant: UseExpenseFormStateProps['variant'];
  onSuccess: () => void;
};

export const ExpenseForm = ({ variant, onSuccess }: ExpenseFormProps) => {
  const { formik, budgets, wallets, isSubmitDisabled } = useExpenseFormState({
    variant,
    onSuccess,
  });
  return (
    <FormikProvider value={formik}>
      <Form>
        <YStack gap="$3">
          <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
            <Field name="budgetId" label="Budget Name" flex={1}>
              <Select
                items={budgets.map(({ id, name }) => ({
                  label: name,
                  value: id,
                }))}
                parseFieldToInputValue={JSON.stringify}
                parseInputToFieldValue={JSON.parse}
              />
            </Field>
            <Field name="walletId" label="Wallet Name" flex={1}>
              <Select
                items={wallets.map(({ id, name }) => ({
                  label: name,
                  value: id,
                }))}
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
                          <Field
                            name={`expenseItems[${index}].amount`}
                            label="Amount"
                            flexBasis="22%"
                            $md={{ flexBasis: '45%' }}
                            $xs={{ flexBasis: '100%' }}
                          >
                            <InputNumber min={1} />
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
  );
};
