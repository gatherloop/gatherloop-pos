import { FieldArray, FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputNumber,
  InputText,
  Sheet,
  SubmitButton,
} from '../../../base';
import { Button, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ProductList, ProductListItem } from '../../../products';
import { Product, TransactionForm } from '../../../../../domain';

export type TransactionCreateViewProps = {
  formik: FormikContextType<TransactionForm>;
  isProductSheetOpen: boolean;
  onProductSheetOpenChange: (isOpen: boolean) => void;
  onAddItem: (product: Product) => void;
  isSubmitDisabled: boolean;
  total: number;
};

export const TransactionCreateView = ({
  formik,
  isProductSheetOpen,
  onProductSheetOpenChange,
  onAddItem,
  isSubmitDisabled,
  total,
}: TransactionCreateViewProps) => {
  return (
    <YStack>
      <FormikProvider value={formik}>
        <Form>
          <Field name="name" label="Customer Name">
            <InputText />
          </Field>
          <YStack>
            <FieldArray name="transactionItems">
              {(fieldArray) => (
                <YStack gap="$3">
                  <Sheet
                    isOpen={isProductSheetOpen}
                    onOpenChange={onProductSheetOpenChange}
                  >
                    <YStack gap="$3" flex={1} padding="$5">
                      <YStack>
                        <H4 textAlign="center">Choose Products</H4>
                        <Paragraph textAlign="center">
                          Product will automatically added to transaction
                        </Paragraph>
                      </YStack>
                      <ProductList onItemPress={onAddItem} />
                    </YStack>
                  </Sheet>

                  <XStack justifyContent="space-between" alignItems="center">
                    <H4>Transaction Items</H4>
                    <Button
                      size="$3"
                      icon={Plus}
                      variant="outlined"
                      onPress={() => onProductSheetOpenChange(true)}
                      circular
                    />
                  </XStack>
                  <YStack gap="$3">
                    {formik.values.transactionItems.map(
                      ({ amount, product }, index) => {
                        return (
                          <XStack
                            key={product.id}
                            gap="$5"
                            $sm={{ flexDirection: 'column' }}
                          >
                            <ProductListItem
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
                                />
                                <InputNumber
                                  name={`transactionItems[${index}].amount`}
                                  min={1}
                                  max={10}
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
            <SubmitButton disabled={isSubmitDisabled} theme="blue">
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
