import {
  Button,
  Card,
  Form,
  H4,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { TransactionForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode, useState } from 'react';
import { TransactionCartView } from './TransactionCartView';
import { TransactionCartButton } from './TransactionCartButton';
import { FieldWatch, Sheet, useIsCompactLayout } from '../base';
import { X } from '@tamagui/lucide-icons';
import { calculateTransactionFinalTotal } from '../../../utils';

export type TransactionFormViewProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
  isCouponSheetOpen: boolean;
  onCouponSheetOpenChange: (isOpen: boolean) => void;
  onItemCouponSheetOpen: (index: number) => void;
  onRemoveItemCoupon: (index: number) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
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
  serverError?: string;
};

export const TransactionFormView = ({
  form,
  onSubmit,
  isCouponSheetOpen,
  onCouponSheetOpenChange,
  onItemCouponSheetOpen,
  onRemoveItemCoupon,
  isSubmitDisabled,
  isSubmitting,
  TransactionItemSelect,
  TransactionCouponList,
  itemsFieldArray,
  couponsFieldArray,
  serverError,
}: TransactionFormViewProps) => {
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const submitButton = (
    <Button
      disabled={isSubmitDisabled}
      onPress={form.handleSubmit(onSubmit)}
      size="$5"
      theme="blue"
      icon={isSubmitting ? <Spinner /> : undefined}
    >
      Submit
    </Button>
  );

  if (isCompactLayout) {
    return (
      <YStack flex={1}>
        <FormProvider {...form}>
          <Form onSubmit={form.handleSubmit(onSubmit)} flex={1}>
            <YStack flex={1} position="relative">
              <YStack flex={1}>{TransactionItemSelect()}</YStack>

              {itemsFieldArray.fields.length > 0 && (
                <FieldWatch
                  control={form.control}
                  name={['transactionItems', 'transactionCoupons']}
                >
                  {([transactionItems, transactionCoupons]) => (
                    <TransactionCartButton
                      itemCount={itemsFieldArray.fields.length}
                      total={calculateTransactionFinalTotal(
                        transactionItems,
                        transactionCoupons
                      )}
                      onPress={() => setIsCartSheetOpen(true)}
                    />
                  )}
                </FieldWatch>
              )}
            </YStack>

            <Sheet isOpen={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
              <YStack flex={1}>
                <XStack
                  padding="$3"
                  alignItems="center"
                  justifyContent="space-between"
                  borderBottomWidth={1}
                  borderBottomColor="$borderColor"
                >
                  <H4>Cart</H4>
                  <Button
                    icon={X}
                    size="$3"
                    circular
                    accessibilityLabel="Close Cart"
                    onPress={() => setIsCartSheetOpen(false)}
                  />
                </XStack>

                <ScrollView flex={1}>
                  <YStack padding="$3">
                    <TransactionCartView
                      form={form}
                      isCouponSheetOpen={isCouponSheetOpen}
                      onCouponSheetOpenChange={onCouponSheetOpenChange}
                      onItemCouponSheetOpen={onItemCouponSheetOpen}
                      onRemoveItemCoupon={onRemoveItemCoupon}
                      TransactionCouponList={TransactionCouponList}
                      itemsFieldArray={itemsFieldArray}
                      couponsFieldArray={couponsFieldArray}
                      serverError={serverError}
                    />
                  </YStack>
                </ScrollView>

                <YStack
                  padding="$3"
                  gap="$3"
                  borderTopWidth={1}
                  borderTopColor="$borderColor"
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <H4 textTransform="none">Total</H4>
                    <FieldWatch
                      control={form.control}
                      name={['transactionItems', 'transactionCoupons']}
                    >
                      {([transactionItems, transactionCoupons]) => (
                        <H4 textTransform="none">
                          Rp.{' '}
                          {calculateTransactionFinalTotal(
                            transactionItems,
                            transactionCoupons
                          ).toLocaleString('id')}
                        </H4>
                      )}
                    </FieldWatch>
                  </XStack>
                  {submitButton}
                </YStack>
              </YStack>
            </Sheet>
          </Form>
        </FormProvider>
      </YStack>
    );
  }

  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <XStack gap="$3">
            <YStack flex={1}>{TransactionItemSelect()}</YStack>
            <YStack gap="$3">
              <Card maxWidth={400} padded alignSelf="flex-start">
                <TransactionCartView
                  form={form}
                  isCouponSheetOpen={isCouponSheetOpen}
                  onCouponSheetOpenChange={onCouponSheetOpenChange}
                  onItemCouponSheetOpen={onItemCouponSheetOpen}
                  onRemoveItemCoupon={onRemoveItemCoupon}
                  TransactionCouponList={TransactionCouponList}
                  itemsFieldArray={itemsFieldArray}
                  couponsFieldArray={couponsFieldArray}
                  serverError={serverError}
                />
              </Card>
              {submitButton}
            </YStack>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
