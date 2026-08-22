import { Button, Card, Form, Spinner, XStack, YStack } from 'tamagui';
import { TransactionForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { TransactionCartView } from './TransactionCartView';

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
              <Button
                disabled={isSubmitDisabled}
                onPress={form.handleSubmit(onSubmit)}
                size="$5"
                theme="blue"
                icon={isSubmitting ? <Spinner /> : undefined}
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
