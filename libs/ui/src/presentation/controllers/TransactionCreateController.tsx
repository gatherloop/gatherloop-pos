import { useEffect, useState } from 'react';
import {
  Variant,
  TransactionCreateUsecase,
  TransactionForm,
  Coupon,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applyCouponToBase } from '../../utils';

export const useTransactionCreateController = (
  usecase: TransactionCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState<boolean>(false);
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

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Transaction Success');
    else if (state.type === 'submitError')
      toast.show('Create Transaction Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        orderNumber: z.number(),
        transactionItems: z
          .array(
            z.lazy(() =>
              z.object({
                amount: z.number().min(1),
                discountAmount: z.number(),
                note: z.string(),
              })
            )
          )
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const itemsFieldArray = useFieldArray<
    TransactionForm,
    'transactionItems',
    'key'
  >({
    name: 'transactionItems',
    control: form.control,
    keyName: 'key',
  });

  const onAddItem = (newVariant: Variant, amount: number) => {
    const itemIndex = itemsFieldArray.fields.findIndex(
      ({ variant }) => newVariant.id === variant.id
    );
    const isItemExist = itemIndex !== -1;
    if (isItemExist) {
      itemsFieldArray.update(itemIndex, {
        ...form.getValues('transactionItems')[itemIndex],
        amount: form.getValues('transactionItems')[itemIndex].amount + amount,
      });
    } else {
      itemsFieldArray.append({
        amount,
        variant: newVariant,
        price: newVariant.price,
        discountAmount: 0,
        note: '',
      });
    }
  };

  const couponsFieldArray = useFieldArray<
    TransactionForm,
    'transactionCoupons',
    'key'
  >({
    name: 'transactionCoupons',
    control: form.control,
    keyName: 'key',
  });

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
        couponsFieldArray.append({
          coupon: newCoupon,
        });
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

  return {
    isCouponSheetOpen,
    onCouponSheetOpenChange,
    onItemCouponSheetOpen,
    state,
    dispatch,
    form,
    onAddItem,
    itemsFieldArray,
    couponsFieldArray,
    onAddCoupon,
    onRemoveItemCoupon,
  };
};
