import { FieldArray, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputNumber,
  InputText,
  Sheet,
  SubmitButton,
} from '../../../base';
import {
  UseTransactionFormStateProps,
  useTransactionFormState,
} from './TransactionForm.state';
import { Button, H3, H5, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ProductCard, ProductList } from '../../../products';

export type TransactionFormProps = {
  variant: UseTransactionFormStateProps['variant'];
  onSuccess: () => void;
};

export const TransactionForm = ({
  variant,
  onSuccess,
}: TransactionFormProps) => {
  const {
    formik,
    total,
    isProductSheetOpen,
    setIsProductSheetOpen,
    onAddItem,
    isFormDisabled,
    isSubmitDisabled,
  } = useTransactionFormState({
    variant,
    onSuccess,
  });
  return (
    <YStack>
      <FormikProvider value={formik}>
        <Form>
          <Field name="name" label="Customer Name">
            <InputText disabled={isFormDisabled} />
          </Field>
          <YStack>
            <FieldArray name="transactionItems">
              {(fieldArray) => (
                <YStack gap="$3">
                  <Sheet
                    isOpen={isProductSheetOpen}
                    onOpenChange={setIsProductSheetOpen}
                  >
                    <YStack gap="$3" flex={1} padding="$5">
                      <YStack>
                        <H4 textAlign="center">Choose Products</H4>
                        <Paragraph textAlign="center">
                          Product will automatically added to transaction
                        </Paragraph>
                      </YStack>
                      <ScrollView flex={1}>
                        <ProductList
                          onItemPress={onAddItem}
                          isSearchAutoFocus
                        />
                      </ScrollView>
                    </YStack>
                  </Sheet>

                  <XStack justifyContent="space-between" alignItems="center">
                    <H4>Transaction Items</H4>
                    <Button
                      size="$3"
                      icon={Plus}
                      variant="outlined"
                      onPress={() => setIsProductSheetOpen(true)}
                      circular
                      disabled={isFormDisabled}
                    />
                  </XStack>
                  <YStack gap="$3">
                    {formik.values.transactionItems?.map(
                      ({ product, amount }, index) => {
                        return (
                          <XStack
                            key={product.id}
                            gap="$5"
                            $sm={{ flexDirection: 'column' }}
                          >
                            <ProductCard
                              flex={1}
                              name={product.name}
                              price={product.price}
                              categoryName={product.category.name}
                            />
                            <YStack
                              gap="$3"
                              $sm={{
                                flexDirection: 'row-reverse',
                                justifyContent: 'flex-start',
                              }}
                            >
                              <YStack>
                                <Paragraph textAlign="right">
                                  Subtotal
                                </Paragraph>
                                <H4 textTransform="none" textAlign="right">
                                  Rp.{' '}
                                  {(product.price * amount).toLocaleString(
                                    'id'
                                  )}
                                </H4>
                              </YStack>
                              <XStack gap="$3" alignItems="center">
                                <Button
                                  icon={Trash}
                                  size="$2"
                                  onPress={() => fieldArray.remove(index)}
                                  theme="red"
                                  color="$red8"
                                  circular
                                  disabled={isFormDisabled}
                                />
                                <InputNumber
                                  name={`transactionItems[${index}].amount`}
                                  min={1}
                                  max={10}
                                  disabled={isFormDisabled}
                                  maxWidth={50}
                                />
                              </XStack>
                            </YStack>
                          </XStack>
                        );
                      }
                    )}
                  </YStack>
                </YStack>
              )}
            </FieldArray>
          </YStack>
          <XStack justifyContent="space-between">
            <SubmitButton
              disabled={isFormDisabled || isSubmitDisabled}
              theme="blue"
            >
              Submit
            </SubmitButton>
            <YStack alignItems="flex-end">
              <H5 textTransform="none">Total</H5>
              <H3>Rp. {total.toLocaleString('id')}</H3>
            </YStack>
          </XStack>
        </Form>
      </FormikProvider>
    </YStack>
  );
};
