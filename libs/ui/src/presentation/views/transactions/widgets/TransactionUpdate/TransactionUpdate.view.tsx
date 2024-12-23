import {
  Field,
  FieldArray,
  FieldWatch,
  InputNumber,
  InputText,
  Sheet,
} from '../../../base';
import { Button, Form, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ProductList, ProductListItem } from '../../../products';
import { Product, TransactionForm } from '../../../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type TransactionUpdateViewProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
  isProductSheetOpen: boolean;
  onProductSheetOpenChange: (isOpen: boolean) => void;
  onAddItem: (product: Product) => void;
  isSubmitDisabled: boolean;
};

export const TransactionUpdateView = ({
  form,
  onSubmit,
  isProductSheetOpen,
  onProductSheetOpenChange,
  onAddItem,
  isSubmitDisabled,
}: TransactionUpdateViewProps) => {
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <Field name="name" label="Customer Name">
            <InputText />
          </Field>
          <YStack>
            <FieldArray control={form.control} name="transactionItems">
              {({ remove }) => (
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
                    {form
                      .getValues('transactionItems')
                      .map(({ product }, index) => {
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
                                <FieldWatch
                                  control={form.control}
                                  name={[`transactionItems.${index}`]}
                                >
                                  {([{ product, amount }]) => (
                                    <H4 textTransform="none" textAlign="right">
                                      Rp.{' '}
                                      {(product.price * amount).toLocaleString(
                                        'id'
                                      )}
                                    </H4>
                                  )}
                                </FieldWatch>
                              </YStack>
                              <XStack gap="$3" alignItems="center">
                                <Button
                                  icon={Trash}
                                  size="$2"
                                  onPress={() => remove(index)}
                                  theme="red"
                                  color="$red8"
                                  circular
                                />
                                <InputNumber
                                  name={`transactionItems.${index}.amount`}
                                  min={1}
                                  maxWidth={50}
                                />
                              </XStack>
                            </YStack>
                          </XStack>
                        );
                      })}
                  </YStack>
                </YStack>
              )}
            </FieldArray>
          </YStack>
          <XStack justifyContent="space-between">
            <Button
              disabled={isSubmitDisabled}
              onPress={form.handleSubmit(onSubmit)}
              theme="blue"
            >
              Submit
            </Button>
            <YStack alignItems="flex-end">
              <H5 textTransform="none">Total</H5>
              <FieldWatch control={form.control} name={['transactionItems']}>
                {([transactionItems]) => (
                  <H3>
                    Rp.{' '}
                    {transactionItems
                      .reduce(
                        (prev, curr) => prev + curr.amount * curr.product.price,
                        0
                      )
                      .toLocaleString('id')}
                  </H3>
                )}
              </FieldWatch>
            </YStack>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
