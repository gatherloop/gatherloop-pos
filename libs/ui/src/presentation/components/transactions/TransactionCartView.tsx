import {
  Field,
  FieldWatch,
  FormErrorBanner,
  InputNumber,
  InputText,
  Sheet,
} from '../base';
import {
  Button,
  H3,
  H4,
  H5,
  Paragraph,
  Separator,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { TransactionForm } from '../../../domain';
import { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';
import { ReactNode } from 'react';
import {
  calculateTransactionCouponDiscounts,
  calculateTransactionFinalTotal,
  calculateTransactionItemsTotal,
} from '../../../utils';

export type TransactionCartViewProps = {
  form: UseFormReturn<TransactionForm>;
  isCouponSheetOpen: boolean;
  onCouponSheetOpenChange: (isOpen: boolean) => void;
  onItemCouponSheetOpen: (index: number) => void;
  onRemoveItemCoupon: (index: number) => void;
  TransactionCouponList: () => ReactNode;
  itemsFieldArray: UseFieldArrayReturn<
    TransactionForm,
    'transactionItems',
    'key'
  >;
  couponsFieldArray: UseFieldArrayReturn<
    TransactionForm,
    'transactionCoupons',
    'key'
  >;
  serverError?: string;
};

export const TransactionCartView = ({
  form,
  isCouponSheetOpen,
  onCouponSheetOpenChange,
  onItemCouponSheetOpen,
  onRemoveItemCoupon,
  TransactionCouponList,
  itemsFieldArray,
  couponsFieldArray,
  serverError,
}: TransactionCartViewProps) => {
  return (
    <YStack gap="$3">
      <FormErrorBanner message={serverError} />
      <Field name="name" label="Customer Name" flex={1}>
        <InputText />
      </Field>
      <Field name="orderNumber" label="Order Number" flex={1}>
        <InputNumber />
      </Field>

      <YStack>
        <YStack gap="$3">
          <Sheet
            isOpen={isCouponSheetOpen}
            onOpenChange={onCouponSheetOpenChange}
          >
            <YStack gap="$3" flex={1} padding="$5">
              {TransactionCouponList()}
            </YStack>
          </Sheet>

          <Separator />

          <H4>Items</H4>
          <YStack gap="$3">
            {itemsFieldArray.fields.map(
              ({ variant, price: fieldPrice, coupon, key }, index) => {
                const isPurchase = variant.product.saleType === 'purchase';
                return (
                  <YStack key={key} gap="$5">
                    <XStack
                      gap="$3"
                      flex={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <XStack gap="$3">
                        <Button
                          icon={Trash}
                          size="$3"
                          onPress={() => itemsFieldArray.remove(index)}
                          theme="red"
                          color="$red8"
                          circular
                        />
                        <YStack>
                          <Paragraph size="$5">
                            {variant.product.name}
                          </Paragraph>
                          <Paragraph>
                            {variant.values
                              .map(({ optionValue }) => optionValue.name)
                              .join(' - ')}
                          </Paragraph>
                        </YStack>
                      </XStack>

                      {isPurchase && (
                        <Paragraph textTransform="none" textAlign="left">
                          Rp. {variant.price.toLocaleString('id')}
                        </Paragraph>
                      )}
                    </XStack>

                    <XStack
                      gap="$5"
                      justifyContent="flex-end"
                      alignItems="center"
                    >
                      {isPurchase && (
                        <InputNumber
                          name={`transactionItems.${index}.amount`}
                          min={1}
                          maxWidth={50}
                        />
                      )}

                      <FieldWatch
                        control={form.control}
                        name={[`transactionItems.${index}`]}
                      >
                        {([{ price, amount, discountAmount }]) => (
                          <H4 textTransform="none" textAlign="right">
                            Rp.{' '}
                            {(price * amount - discountAmount).toLocaleString(
                              'id'
                            )}
                          </H4>
                        )}
                      </FieldWatch>
                    </XStack>

                    <InputText
                      name={`transactionItems.${index}.note`}
                      placeholder="Add Notes"
                      flex={1}
                    />

                    <XStack
                      gap="$3"
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                    >
                      {coupon ? (
                        <XStack gap="$3" alignItems="center">
                          <Button
                            icon={Trash}
                            size="$2"
                            onPress={() => onRemoveItemCoupon(index)}
                            theme="red"
                            color="$red8"
                            circular
                            accessibilityLabel="Remove Coupon"
                          />
                          <Paragraph>{coupon.coupon.code}</Paragraph>
                          <FieldWatch
                            control={form.control}
                            name={[`transactionItems.${index}.discountAmount`]}
                          >
                            {([discountAmount]) => (
                              <Paragraph>
                                - Rp. {discountAmount.toLocaleString('id')}
                              </Paragraph>
                            )}
                          </FieldWatch>
                        </XStack>
                      ) : (
                        <Button
                          size="$2"
                          icon={Plus}
                          variant="outlined"
                          onPress={() => onItemCouponSheetOpen(index)}
                        >
                          Apply Coupon
                        </Button>
                      )}
                    </XStack>

                    <Separator />
                  </YStack>
                );
              }
            )}
          </YStack>

          <Separator />

          <XStack justifyContent="space-between" alignItems="center">
            <H4>Coupons</H4>
            <Button
              size="$3"
              icon={Plus}
              variant="outlined"
              onPress={() => onCouponSheetOpenChange(true)}
              circular
            />
          </XStack>
          <YStack gap="$3">
            {couponsFieldArray.fields.map(({ coupon, key }, index) => {
              return (
                <XStack key={key} gap="$5" $lg={{ flexDirection: 'column' }}>
                  <XStack gap="$3" flex={1} alignItems="center">
                    <Button
                      icon={Trash}
                      size="$3"
                      onPress={() => couponsFieldArray.remove(index)}
                      theme="red"
                      color="$red8"
                      circular
                    />
                    <Paragraph>{coupon.code}</Paragraph>
                  </XStack>

                  <XStack
                    gap="$5"
                    justifyContent="flex-end"
                    alignItems="flex-end"
                  >
                    <FieldWatch
                      control={form.control}
                      name={['transactionItems', 'transactionCoupons']}
                    >
                      {([transactionItems, transactionCoupons]) => {
                        const itemsTotal =
                          calculateTransactionItemsTotal(transactionItems);
                        const discountAmount =
                          calculateTransactionCouponDiscounts(
                            itemsTotal,
                            transactionCoupons
                          )[index];

                        return (
                          <H4 textTransform="none" textAlign="right">
                            - Rp. {discountAmount.toLocaleString('id')}
                          </H4>
                        );
                      }}
                    </FieldWatch>
                  </XStack>
                </XStack>
              );
            })}
          </YStack>
        </YStack>
      </YStack>
      <YStack alignItems="flex-end">
        <H5 textTransform="none">Total</H5>
        <FieldWatch
          control={form.control}
          name={['transactionItems', 'transactionCoupons']}
        >
          {([transactionItems, transactionCoupons]) => {
            const total = calculateTransactionItemsTotal(transactionItems);
            const finalTotal = calculateTransactionFinalTotal(
              transactionItems,
              transactionCoupons
            );

            return (
              <YStack>
                {finalTotal < total ? (
                  <H4 textDecorationLine="line-through">
                    Rp. {total.toLocaleString('id')}
                  </H4>
                ) : null}
                <H3>Rp. {finalTotal.toLocaleString('id')}</H3>
              </YStack>
            );
          }}
        </FieldWatch>
      </YStack>
    </YStack>
  );
};
