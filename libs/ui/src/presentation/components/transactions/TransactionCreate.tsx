import {
  Field,
  FieldArray,
  FieldWatch,
  InputNumber,
  InputText,
  Sheet,
} from '../base';
import { Button, Form, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ProductListItem } from '../products';
import { TransactionForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { ReactNode } from 'react';

export type TransactionCreateProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
  isProductSheetOpen: boolean;
  onProductSheetOpenChange: (isOpen: boolean) => void;
  isSubmitDisabled: boolean;
  ProductList: ReactNode;
};

export const TransactionCreate = ({
  form,
  onSubmit,
  isProductSheetOpen,
  onProductSheetOpenChange,
  isSubmitDisabled,
  ProductList,
}: TransactionCreateProps) => {
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
                      {ProductList}
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
                            $lg={{ flexDirection: 'column' }}
                          >
                            <XStack gap="$3" flex={1} alignItems="center">
                              <Button
                                icon={Trash}
                                size="$3"
                                onPress={() => remove(index)}
                                theme="red"
                                color="$red8"
                                circular
                              />
                              <ProductListItem
                                flex={1}
                                name={product.name}
                                price={product.price}
                                categoryName={product.category.name}
                              />
                            </XStack>

                            <XStack
                              gap="$5"
                              justifyContent="flex-end"
                              alignItems="flex-end"
                            >
                              <YStack gap="$3">
                                <Paragraph textAlign="left">Price</Paragraph>
                                <H4 textTransform="none" textAlign="left">
                                  Rp. {product.price.toLocaleString('id')}
                                </H4>
                              </YStack>
                              <YStack gap="$3">
                                <Paragraph textAlign="center">Amount</Paragraph>
                                <InputNumber
                                  name={`transactionItems.${index}.amount`}
                                  min={1}
                                  maxWidth={50}
                                />
                              </YStack>

                              <YStack gap="$3">
                                <Paragraph textAlign="center">
                                  Discount Amount
                                </Paragraph>
                                <InputNumber
                                  name={`transactionItems.${index}.discountAmount`}
                                  min={0}
                                  maxWidth={150}
                                  step={500}
                                />
                              </YStack>

                              <YStack>
                                <Paragraph textAlign="right">
                                  Subtotal
                                </Paragraph>
                                <FieldWatch
                                  control={form.control}
                                  name={[`transactionItems.${index}`]}
                                >
                                  {([{ product, amount, discountAmount }]) => (
                                    <H4 textTransform="none" textAlign="right">
                                      Rp.{' '}
                                      {(
                                        product.price * amount -
                                        discountAmount
                                      ).toLocaleString('id')}
                                    </H4>
                                  )}
                                </FieldWatch>
                              </YStack>
                            </XStack>
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
                        (prev, curr) =>
                          prev +
                          (curr.amount * curr.product.price -
                            curr.discountAmount),
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
