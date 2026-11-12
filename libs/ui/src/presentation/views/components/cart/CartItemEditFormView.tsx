import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import {
  CartItem,
  CartItemEditForm,
  cartItemEditFormSchema,
} from '../../../../domain/entities/Cart';
import { formatRupiah } from '../../../../utils/currency';
import { Field, FieldWatch, FormView, Textarea } from '../base/Form';
import { AmountStepper } from '../menu/AmountStepper';
import { MenuItemThumbnail } from '../menu/MenuItemThumbnail';
import {
  PendingPaymentNotice,
  PendingPaymentNoticeProps,
} from './PendingPaymentNotice';

const cartItemEditFormResolver = zodResolver(cartItemEditFormSchema);

export type CartItemEditFormViewProps = {
  item: CartItem;
  defaultValues: CartItemEditForm;
  onSubmit: (values: CartItemEditForm) => void;
  isSaving: boolean;
  lockedNotice: PendingPaymentNoticeProps | null;
  soldOutBadge: ReactNode;
};

export const CartItemEditFormView = ({
  item,
  defaultValues,
  onSubmit,
  isSaving,
  lockedNotice,
  soldOutBadge,
}: CartItemEditFormViewProps) => {
  const optionValueNames = item.variant.values
    .map((value) => value.optionValue.name)
    .join(', ');

  const isSoldOut = !item.variant.isSellable;
  const remainingQuantity = item.variant.sellableQuantity;
  const isLocked = lockedNotice !== null;

  return (
    <FormView
      variant={{ type: 'loaded' }}
      defaultValues={defaultValues}
      resolver={cartItemEditFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Memuat item..."
      errorTitle="Gagal memuat item"
      formProps={{ flex: 1, gap: 0 }}
    >
      {(form) => (
        <YStack flex={1}>
          <ScrollView>
            <YStack flex={1} gap="$4" paddingHorizontal="$4" paddingBottom="$4">
              <XStack gap="$3" alignItems="center">
                <MenuItemThumbnail
                  imageUrl={item.variant.product.imageUrl}
                  station={item.variant.product.category.station}
                  width={64}
                  height={64}
                  flexShrink={0}
                />
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize="$6" fontWeight="bold" numberOfLines={1}>
                      {item.variant.product.name}
                    </Text>
                    {isSoldOut ? soldOutBadge : null}
                  </XStack>
                  {optionValueNames ? (
                    <Text color="$color10" numberOfLines={1}>
                      {optionValueNames}
                    </Text>
                  ) : null}
                </YStack>
              </XStack>

              <Field name="note" label="Catatan" gap="$2">
                <Textarea
                  placeholder="Contoh: less sugar, tanpa es"
                  accessibilityLabel="Catatan"
                  minHeight={80}
                  maxLength={255}
                  disabled={isLocked}
                />
              </Field>

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="bold">Jumlah</Text>
                <Controller
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <AmountStepper
                      amount={field.value}
                      onChange={field.onChange}
                      max={remainingQuantity}
                      disabled={isSoldOut || isLocked}
                      size="sm"
                    />
                  )}
                />
              </XStack>
            </YStack>
          </ScrollView>

          <YStack
            padding="$4"
            gap="$2"
            borderTopWidth={1}
            borderTopColor="$borderColor"
            backgroundColor="$background"
          >
            {lockedNotice ? (
              <PendingPaymentNotice {...lockedNotice} />
            ) : (
              <>
                <XStack justifyContent="space-between">
                  <Text fontWeight="bold">Total</Text>
                  <FieldWatch control={form.control} name={['amount']}>
                    {([amount]) => (
                      <Text fontWeight="bold">
                        {formatRupiah(item.price * amount)}
                      </Text>
                    )}
                  </FieldWatch>
                </XStack>
                <Button
                  theme="blue"
                  size="$5"
                  minHeight={44}
                  disabled={isSaving}
                  onPress={form.handleSubmit(onSubmit)}
                >
                  Simpan
                </Button>
              </>
            )}
          </YStack>
        </YStack>
      )}
    </FormView>
  );
};
