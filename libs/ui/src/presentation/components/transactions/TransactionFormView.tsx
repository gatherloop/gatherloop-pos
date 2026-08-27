import {
  Button,
  Card,
  H4,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Coupon, TransactionForm, transactionFormSchema } from '../../../domain';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { MutableRefObject, ReactNode, useState } from 'react';
import { TransactionCartView } from './TransactionCartView';
import { TransactionCartButton } from './TransactionCartButton';
import {
  FieldArray,
  FieldWatch,
  FormVariant,
  FormView,
  Sheet,
  useIsCompactLayout,
} from '../base';
import { ArrowLeft, X } from '@tamagui/lucide-icons';
import { applyCouponToBase, calculateTransactionFinalTotal } from '../../../utils';

// `transactionFormSchema` is a partial validator (§4.4.2), so `{ raw: true }`
// is required to keep `variant`, `price` and `coupon` intact on submit.
const transactionFormResolver = zodResolver(
  transactionFormSchema,
  {},
  { raw: true }
);

export type TransactionFormViewProps = {
  variant: FormVariant;
  defaultValues: TransactionForm;
  onSubmit: (form: TransactionForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  TransactionItemSelect: () => ReactNode;
  TransactionCouponList: (onItemPress: (coupon: Coupon) => void) => ReactNode;
  /**
   * Escape hatch so `TransactionCreateHandler` / `TransactionUpdateHandler`
   * can push an item picked in the sibling `transactionItemSelect`
   * controller into this form (see TRD §4.6). Null until this view's
   * `loaded` branch mounts.
   */
  formRef?: MutableRefObject<UseFormReturn<TransactionForm> | null>;
  serverError?: string;
};

export const TransactionFormView = (props: TransactionFormViewProps) => {
  const {
    onSubmit,
    isSubmitDisabled,
    isSubmitting,
    isSubmitSuccess,
    TransactionItemSelect,
    TransactionCouponList,
    serverError,
  } = props;
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState(false);
  const [couponSheetItemIndex, setCouponSheetItemIndex] = useState<
    number | null
  >(null);

  const onCouponSheetOpenChange = (open: boolean) => {
    setIsCouponSheetOpen(open);
    setCouponSheetItemIndex(null);
  };

  const onItemCouponSheetOpen = (index: number) => {
    setCouponSheetItemIndex(index);
    setIsCouponSheetOpen(true);
  };

  // A successful submit must close the cart sheet before any dialog that
  // follows it (e.g. the payment alert on Create) opens on top — see PRD
  // FR-7 and the "AlertDialog over Sheet" risk. Adjusted during render (not
  // in an effect) so it is guaranteed to land before any effect — including
  // the caller's own "submit succeeded" effect that opens that dialog.
  const [wasSubmitSuccess, setWasSubmitSuccess] = useState(isSubmitSuccess);
  if (isSubmitSuccess !== wasSubmitSuccess) {
    setWasSubmitSuccess(isSubmitSuccess);
    if (isSubmitSuccess) setIsCartSheetOpen(false);
  }

  return (
    <FormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      resolver={transactionFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Fetching Transaction..."
      errorTitle="Failed to Fetch Transaction"
      formRef={props.formRef}
      formProps={isCompactLayout ? { flex: 1, gap: undefined } : { gap: '$3' }}
    >
      {(form) => (
        <FieldArray<TransactionForm, 'transactionItems', 'key'>
          name="transactionItems"
          keyName="key"
          control={form.control}
        >
          {(itemsFieldArray) => (
            <FieldArray<TransactionForm, 'transactionCoupons', 'key'>
              name="transactionCoupons"
              keyName="key"
              control={form.control}
            >
              {(couponsFieldArray) => {
                const onAddCoupon = (newCoupon: Coupon) => {
                  if (couponSheetItemIndex !== null) {
                    const item = form.getValues(
                      `transactionItems.${couponSheetItemIndex}`
                    );
                    const base = item.price * item.amount;
                    itemsFieldArray.update(couponSheetItemIndex, {
                      ...item,
                      coupon: { id: item.coupon?.id, coupon: newCoupon },
                      discountAmount: applyCouponToBase(base, newCoupon),
                    });
                  } else {
                    const couponIndex = couponsFieldArray.fields.findIndex(
                      ({ coupon }) => newCoupon.id === coupon.id
                    );
                    const isCouponExist = couponIndex !== -1;
                    if (isCouponExist) {
                      couponsFieldArray.update(couponIndex, {
                        ...form.getValues('transactionCoupons')[couponIndex],
                      });
                    } else {
                      couponsFieldArray.append({ coupon: newCoupon });
                    }
                  }

                  setIsCouponSheetOpen(false);
                  setCouponSheetItemIndex(null);
                };

                const onRemoveItemCoupon = (index: number) => {
                  const item = form.getValues(`transactionItems.${index}`);
                  itemsFieldArray.update(index, {
                    ...item,
                    coupon: undefined,
                    discountAmount: 0,
                  });
                };

                const renderTransactionCouponList = () =>
                  TransactionCouponList(onAddCoupon);

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

                      <Sheet
                        isOpen={isCartSheetOpen}
                        onOpenChange={setIsCartSheetOpen}
                      >
                        {/* Tamagui's modal `Sheet` renders its content
                            through its own portal host rather than as a
                            plain DOM/native child, which on some platforms
                            (e.g. Android) does not carry the ambient React
                            context down from the outer `FormProvider` above.
                            Since everything in here reads the transaction
                            form via `useFormContext()`, re-establish the
                            provider inside the sheet so it survives
                            regardless of how the sheet portals its
                            content. */}
                        <FormProvider {...form}>
                          <YStack flex={1}>
                            <XStack
                              padding="$3"
                              alignItems="center"
                              justifyContent="space-between"
                              borderBottomWidth={1}
                              borderBottomColor="$borderColor"
                            >
                              {isCouponSheetOpen ? (
                                <XStack gap="$3" alignItems="center">
                                  <Button
                                    icon={ArrowLeft}
                                    size="$3"
                                    circular
                                    accessibilityLabel="Back to Cart"
                                    onPress={() =>
                                      onCouponSheetOpenChange(false)
                                    }
                                  />
                                  <H4>Apply Coupon</H4>
                                </XStack>
                              ) : (
                                <>
                                  <H4>Cart</H4>
                                  <Button
                                    icon={X}
                                    size="$3"
                                    circular
                                    accessibilityLabel="Close Cart"
                                    onPress={() => setIsCartSheetOpen(false)}
                                  />
                                </>
                              )}
                            </XStack>

                            <ScrollView flex={1}>
                              <YStack padding="$3" flex={1}>
                                {isCouponSheetOpen ? (
                                  renderTransactionCouponList()
                                ) : (
                                  <TransactionCartView
                                    form={form}
                                    isCouponSheetOpen={isCouponSheetOpen}
                                    onCouponSheetOpenChange={
                                      onCouponSheetOpenChange
                                    }
                                    onItemCouponSheetOpen={
                                      onItemCouponSheetOpen
                                    }
                                    onRemoveItemCoupon={onRemoveItemCoupon}
                                    TransactionCouponList={
                                      renderTransactionCouponList
                                    }
                                    itemsFieldArray={itemsFieldArray}
                                    couponsFieldArray={couponsFieldArray}
                                    serverError={serverError}
                                  />
                                )}
                              </YStack>
                            </ScrollView>

                            {!isCouponSheetOpen && (
                              <YStack
                                padding="$3"
                                gap="$3"
                                borderTopWidth={1}
                                borderTopColor="$borderColor"
                              >
                                <XStack
                                  alignItems="center"
                                  justifyContent="space-between"
                                >
                                  <H4 textTransform="none">Total</H4>
                                  <FieldWatch
                                    control={form.control}
                                    name={[
                                      'transactionItems',
                                      'transactionCoupons',
                                    ]}
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
                            )}
                          </YStack>
                        </FormProvider>
                      </Sheet>
                    </YStack>
                  );
                }

                return (
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
                          TransactionCouponList={renderTransactionCouponList}
                          itemsFieldArray={itemsFieldArray}
                          couponsFieldArray={couponsFieldArray}
                          serverError={serverError}
                        />
                      </Card>
                      {submitButton}
                    </YStack>
                  </XStack>
                );
              }}
            </FieldArray>
          )}
        </FieldArray>
      )}
    </FormView>
  );
};
