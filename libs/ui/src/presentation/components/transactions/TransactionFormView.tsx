import { Field, FieldWatch, InputNumber, InputText, Sheet } from '../base';
import {
  Button,
  Card,
  Form,
  H3,
  H5,
  Paragraph,
  Separator,
  XStack,
  YStack,
} from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { TransactionForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { roundToNearest500 } from '../../../utils';

export type TransactionFormViewProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
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
  isCouponSheetOpen,
  onCouponSheetOpenChange,
  isSubmitDisabled,
  TransactionItemSelect,
  TransactionCouponList,
  itemsFieldArray,
  couponsFieldArray,
}: TransactionFormViewProps) => {
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <XStack gap="$3">
            <YStack flex={1}>{TransactionItemSelect()}</YStack>
            <YStack gap="$3">
              <Card flex={1} maxWidth={400} padded alignSelf="flex-start">
                <YStack gap="$3">
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
                          ({ variant, key }, index) => {
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
                                      onPress={() =>
                                        itemsFieldArray.remove(index)
                                      }
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
                                          .map(
                                            ({ optionValue }) =>
                                              optionValue.name
                                          )
                                          .join(' - ')}
                                      </Paragraph>
                                    </YStack>
                                  </XStack>

                                  <Paragraph
                                    textTransform="none"
                                    textAlign="left"
                                  >
                                    Rp. {variant.price.toLocaleString('id')}
                                  </Paragraph>
                                </XStack>

                                <XStack
                                  gap="$5"
                                  justifyContent="flex-end"
                                  alignItems="center"
                                >
                                  <InputNumber
                                    name={`transactionItems.${index}.amount`}
                                    min={1}
                                    maxWidth={50}
                                  />

                                  <FieldWatch
                                    control={form.control}
                                    name={[`transactionItems.${index}`]}
                                  >
                                    {([
                                      { variant, amount, discountAmount },
                                    ]) => (
                                      <H4
                                        textTransform="none"
                                        textAlign="right"
                                      >
                                        Rp.{' '}
                                        {(
                                          variant.price * amount -
                                          discountAmount
                                        ).toLocaleString('id')}
                                      </H4>
                                    )}
                                  </FieldWatch>
                                </XStack>

                                <Separator />
                              </YStack>
                            );
                          }
                        )}
                      </YStack>

                      <Separator />

                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
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
                        {couponsFieldArray.fields.map(
                          ({ coupon, key }, index) => {
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
                                    onPress={() =>
                                      couponsFieldArray.remove(index)
                                    }
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
                                    name={[
                                      'transactionItems',
                                      `transactionCoupons`,
                                    ]}
                                  >
                                    {([
                                      transactionItems,
                                      transactionCoupons,
                                    ]) => {
                                      let calculatedTotal =
                                        transactionItems.reduce(
                                          (prev, curr) =>
                                            prev +
                                            (curr.amount * curr.variant.price -
                                              curr.discountAmount),
                                          0
                                        );

                                      for (let i = 0; i < index; i++) {
                                        const prevCoupon =
                                          transactionCoupons[i];
                                        const prevDiscountAmount =
                                          prevCoupon.coupon.type === 'fixed'
                                            ? prevCoupon.coupon.amount
                                            : prevCoupon.coupon.type ===
                                              'percentage'
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
                                              (calculatedTotal *
                                                coupon.amount) /
                                                100
                                            )
                                          : 0;

                                      return (
                                        <H4
                                          textTransform="none"
                                          textAlign="right"
                                        >
                                          - Rp.{' '}
                                          {discountAmount.toLocaleString('id')}
                                        </H4>
                                      );
                                    }}
                                  </FieldWatch>
                                </XStack>
                              </XStack>
                            );
                          }
                        )}
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
                            (curr.amount * curr.variant.price -
                              curr.discountAmount),
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
                </YStack>
              </Card>
              <Button
                disabled={isSubmitDisabled}
                onPress={form.handleSubmit(onSubmit)}
                size="$5"
                theme="blue"
              >
                Submit
              </Button>
            </YStack>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
