import { Field, FieldWatch, InputNumber, InputText, Sheet } from '../base';
import { Button, Form, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { VariantListItem } from '../variants';
import { TransactionForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { roundToNearest500, useKeyboardShortcut } from '../../../utils';
import { CouponListItem } from '../coupons';

export type TransactionFormViewProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
  isVariantSheetOpen: boolean;
  onVariantSheetOpenChange: (isOpen: boolean) => void;
  isCouponSheetOpen: boolean;
  onCouponSheetOpenChange: (isOpen: boolean) => void;
  isSubmitDisabled: boolean;
  TransactionItemSelect: () => ReactNode;
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
};

export const TransactionFormView = ({
  form,
  onSubmit,
  isVariantSheetOpen,
  onVariantSheetOpenChange,
  isCouponSheetOpen,
  onCouponSheetOpenChange,
  isSubmitDisabled,
  TransactionItemSelect,
  TransactionCouponList,
  itemsFieldArray,
  couponsFieldArray,
}: TransactionFormViewProps) => {
  useKeyboardShortcut({
    ctrl: { ' ': () => onVariantSheetOpenChange(true) },
  });
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <Field name="name" label="Customer Name">
            <InputText />
          </Field>
          <YStack>
            <YStack gap="$3">
              <Sheet
                isOpen={isVariantSheetOpen}
                onOpenChange={onVariantSheetOpenChange}
              >
                <YStack gap="$3" flex={1} padding="$5">
                  {TransactionItemSelect()}
                </YStack>
              </Sheet>

              <Sheet
                isOpen={isCouponSheetOpen}
                onOpenChange={onCouponSheetOpenChange}
              >
                <YStack gap="$3" flex={1} padding="$5">
                  {TransactionCouponList()}
                </YStack>
              </Sheet>

              <XStack justifyContent="space-between" alignItems="center">
                <H4>Transaction Items</H4>
                <Button
                  size="$3"
                  icon={Plus}
                  variant="outlined"
                  onPress={() => onVariantSheetOpenChange(true)}
                  circular
                />
              </XStack>
              <YStack gap="$3">
                {itemsFieldArray.fields.map(({ variant, key }, index) => {
                  return (
                    <XStack
                      key={key}
                      gap="$5"
                      $lg={{ flexDirection: 'column' }}
                    >
                      <XStack gap="$3" flex={1} alignItems="center">
                        <Button
                          icon={Trash}
                          size="$3"
                          onPress={() => itemsFieldArray.remove(index)}
                          theme="red"
                          color="$red8"
                          circular
                        />
                        <VariantListItem
                          flex={1}
                          price={variant.price}
                          productImageUrl={variant.product.imageUrl}
                          productName={variant.product.name}
                          optionValues={variant.values.map(
                            (variantValue) => variantValue.optionValue
                          )}
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
                            Rp. {variant.price.toLocaleString('id')}
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
                          <Paragraph textAlign="right">Subtotal</Paragraph>
                          <FieldWatch
                            control={form.control}
                            name={[`transactionItems.${index}`]}
                          >
                            {([{ variant, amount, discountAmount }]) => (
                              <H4 textTransform="none" textAlign="right">
                                Rp.{' '}
                                {(
                                  variant.price * amount -
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

              <XStack justifyContent="space-between" alignItems="center">
                <H4>Transaction Coupons</H4>
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
                    <XStack
                      key={key}
                      gap="$5"
                      $lg={{ flexDirection: 'column' }}
                    >
                      <XStack gap="$3" flex={1} alignItems="center">
                        <Button
                          icon={Trash}
                          size="$3"
                          onPress={() => couponsFieldArray.remove(index)}
                          theme="red"
                          color="$red8"
                          circular
                        />
                        <CouponListItem
                          flex={1}
                          amount={coupon.amount}
                          code={coupon.code}
                          type={coupon.type}
                        />
                      </XStack>

                      <XStack
                        gap="$5"
                        justifyContent="flex-end"
                        alignItems="flex-end"
                      >
                        <YStack>
                          <Paragraph textAlign="right">Subtotal</Paragraph>
                          <FieldWatch
                            control={form.control}
                            name={['transactionItems', `transactionCoupons`]}
                          >
                            {([transactionItems, transactionCoupons]) => {
                              let calculatedTotal = transactionItems.reduce(
                                (prev, curr) =>
                                  prev +
                                  (curr.amount * curr.variant.price -
                                    curr.discountAmount),
                                0
                              );

                              for (let i = 0; i < index; i++) {
                                const prevCoupon = transactionCoupons[i];
                                const prevDiscountAmount =
                                  prevCoupon.coupon.type === 'fixed'
                                    ? prevCoupon.coupon.amount
                                    : prevCoupon.coupon.type === 'percentage'
                                    ? roundToNearest500(
                                        (calculatedTotal *
                                          prevCoupon.coupon.amount) /
                                          100
                                      )
                                    : 0;
                                calculatedTotal -= prevDiscountAmount;
                              }

                              const discountAmount =
                                coupon.type === 'fixed'
                                  ? coupon.amount
                                  : coupon.type === 'percentage'
                                  ? roundToNearest500(
                                      (calculatedTotal * coupon.amount) / 100
                                    )
                                  : 0;

                              return (
                                <H4 textTransform="none" textAlign="right">
                                  - Rp. {discountAmount.toLocaleString('id')}
                                </H4>
                              );
                            }}
                          </FieldWatch>
                        </YStack>
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
                const total = transactionItems.reduce(
                  (prev, curr) =>
                    prev +
                    (curr.amount * curr.variant.price - curr.discountAmount),
                  0
                );

                let finalTotal = total;

                for (let i = 0; i < transactionCoupons.length; i++) {
                  const couponItem = transactionCoupons[i];
                  const discountAmount =
                    couponItem.coupon.type === 'fixed'
                      ? couponItem.coupon.amount
                      : couponItem.coupon.type === 'percentage'
                      ? roundToNearest500(
                          (finalTotal * couponItem.coupon.amount) / 100
                        )
                      : 0;
                  finalTotal -= discountAmount;
                }

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
          <XStack justifyContent="flex-end" gap="$3">
            <Button
              disabled={isSubmitDisabled}
              onPress={form.handleSubmit(onSubmit)}
              size="$5"
              theme="blue"
            >
              Submit
            </Button>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
