import { H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import dayjs from 'dayjs';
import { VariantListItem } from '../variants';
import {
  Calendar,
  ConciergeBell,
  CreditCard,
  User,
  Wallet,
} from '@tamagui/lucide-icons';
import { Transaction } from '../../../domain';
import { CouponListItem } from '../coupons';
import { roundToNearest500 } from '../../../utils';

type SummaryRowData = {
  key: string;
  icon: JSX.Element;
  label: string;
  value: string | number;
};

const SummaryRow = ({ icon, label, value }: SummaryRowData) => (
  <XStack
    width="100%"
    $gtXs={{ width: '48%' }}
    justifyContent="space-between"
    alignItems="center"
    gap="$2"
  >
    <XStack alignItems="center" gap="$2">
      {icon}
      <Paragraph size="$2" color="$color10">
        {label}
      </Paragraph>
    </XStack>
    <Paragraph size="$4" fontWeight="bold" textAlign="right">
      {value}
    </Paragraph>
  </XStack>
);

type ItemMetricData = {
  key: string;
  label: string;
  value: string | number;
  fullWidth?: boolean;
};

const ItemMetric = ({ label, value, fullWidth }: ItemMetricData) => (
  <YStack $xs={{ flexBasis: fullWidth ? '100%' : '48%' }}>
    <Paragraph textAlign="right">{label}</Paragraph>
    <H4 textAlign="right">{value}</H4>
  </YStack>
);

export type TransactionDetailProps = {
  name: string;
  orderNumber: number;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  total: number;
  paidAmount: number;
  transactionItems: Transaction['transactionItems'];
  transactionCoupons: Transaction['transactionCoupons'];
};

export const TransactionDetail = ({
  name,
  orderNumber,
  createdAt,
  paidAt,
  walletName,
  total,
  transactionItems,
  transactionCoupons,
  paidAmount,
}: TransactionDetailProps) => {
  function getDiscountAmount(index: number) {
    let calculatedTotal = transactionItems.reduce(
      (prev, curr) =>
        prev + (curr.amount * curr.variant.price - curr.discountAmount),
      0
    );

    for (let i = 0; i < index; i++) {
      const prevCoupon = transactionCoupons[i];
      const prevDiscountAmount =
        prevCoupon.coupon.type === 'fixed'
          ? prevCoupon.coupon.amount
          : prevCoupon.coupon.type === 'percentage'
          ? roundToNearest500(
              (calculatedTotal * prevCoupon.coupon.amount) / 100
            )
          : 0;
      calculatedTotal -= prevDiscountAmount;
    }

    const currentCoupon = transactionCoupons[index];

    const discountAmount =
      currentCoupon.type === 'fixed'
        ? currentCoupon.amount
        : currentCoupon.type === 'percentage'
        ? roundToNearest500((calculatedTotal * currentCoupon.amount) / 100)
        : 0;

    return discountAmount;
  }

  const summaryRows: SummaryRowData[] = [
    { key: 'name', icon: <User size="$1" />, label: 'Customer Name', value: name },
  ];

  if (orderNumber > 0) {
    summaryRows.push({
      key: 'orderNumber',
      icon: <ConciergeBell size="$1" />,
      label: 'Order Number',
      value: orderNumber,
    });
  }

  summaryRows.push({
    key: 'createdAt',
    icon: <Calendar size="$1" />,
    label: 'Transaction Date',
    value: dayjs(createdAt).format('DD/MM/YYYY HH:mm'),
  });

  if (paidAt) {
    summaryRows.push(
      {
        key: 'paidAt',
        icon: <CreditCard size="$1" />,
        label: 'Paid At',
        value: dayjs(paidAt).format('DD/MM/YYYY HH:mm'),
      },
      {
        key: 'paidAmount',
        icon: <CreditCard size="$1" />,
        label: 'Paid Amount',
        value: `Rp. ${paidAmount.toLocaleString('id')}`,
      },
      {
        key: 'change',
        icon: <CreditCard size="$1" />,
        label: 'Change',
        value: `Rp. ${(paidAmount - total).toLocaleString('id')}`,
      },
      {
        key: 'wallet',
        icon: <Wallet size="$1" />,
        label: 'Wallet',
        value: walletName ?? '',
      }
    );
  } else {
    summaryRows.push({
      key: 'payment',
      icon: <CreditCard size="$1" />,
      label: 'Payment',
      value: 'Unpaid',
    });
  }

  return (
    <YStack gap="$3">
      <YStack
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$4"
        padding="$3"
      >
        <XStack flexWrap="wrap" rowGap="$2" columnGap="$4">
          {summaryRows.map((row) => (
            <SummaryRow key={row.key} {...row} />
          ))}
        </XStack>
      </YStack>
      <H4>Transaction Items</H4>
      <YStack gap="$3">
        {transactionItems.map(
          ({
            id,
            price,
            variant,
            amount,
            subtotal,
            discountAmount,
            note,
            productName,
            values,
          }) => (
            <YStack key={id} gap="$3">
              <VariantListItem
                productSaleType={variant.product.saleType}
                productName={productName}
                productImageUrl={variant.product.imageUrl}
                price={price}
                optionValues={values.map((value) => ({
                  id: value.id,
                  name: value.optionValueName,
                }))}
                flex={1}
              />

              <XStack
                flexWrap="wrap"
                rowGap="$3"
                columnGap="$5"
                justifyContent="flex-end"
              >
                {note && (
                  <ItemMetric key="note" label="Note" value={note} fullWidth />
                )}
                <ItemMetric
                  key="price"
                  label="Price"
                  value={`Rp. ${price.toLocaleString('id')}`}
                />
                <ItemMetric key="amount" label="Amount" value={amount} />
                {discountAmount > 0 && (
                  <ItemMetric
                    key="discountAmount"
                    label="Discount Amount"
                    value={`Rp. ${discountAmount.toLocaleString('id')}`}
                  />
                )}
                <ItemMetric
                  key="subtotal"
                  label="Subtotal"
                  value={`Rp. ${subtotal.toLocaleString('id')}`}
                />
              </XStack>
            </YStack>
          )
        )}
      </YStack>

      <H4>Transaction Coupons</H4>
      <YStack gap="$3">
        {transactionCoupons.map(({ amount, type, coupon }, index) => (
          <YStack key={coupon.id} gap="$3">
            <CouponListItem
              amount={amount}
              code={coupon.code}
              type={type}
              flex={1}
            />

            <XStack gap="$5" justifyContent="flex-end">
              <YStack>
                <Paragraph textAlign="right">Subtotal</Paragraph>
                <H4 textAlign="right">
                  - Rp. {getDiscountAmount(index).toLocaleString('id')}
                </H4>
              </YStack>
            </XStack>
          </YStack>
        ))}
      </YStack>

      <YStack alignItems="flex-end">
        <Paragraph>Total</Paragraph>
        <H3>Rp. {total.toLocaleString('id')}</H3>
      </YStack>
    </YStack>
  );
};
