import { Card, H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import dayjs from 'dayjs';
import { VariantListItem } from '../variants';
import {
  Calendar,
  ConciergeBell,
  CreditCard,
  User,
  Wallet,
} from '@tamagui/lucide-icons';
import { H5 } from 'tamagui';
import { TransactionCoupon, TransactionItem } from '../../../domain';
import { CouponListItem } from '../coupons';
import { roundToNearest500 } from '../../../utils';

// `TransactionItem[]` / `TransactionCoupon[]` rather than the indexed access
// `Transaction['transactionItems']`: Storybook's react-docgen cannot resolve an
// indexed access type and emits a prop node with no `elements`, which throws
// inside its argTypes conversion — a console error on every story of this
// component plus half-broken Controls.
export type TransactionDetailProps = {
  name: string;
  orderNumber: number;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  total: number;
  paidAmount: number;
  transactionItems: TransactionItem[];
  transactionCoupons: TransactionCoupon[];
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

  return (
    <YStack gap="$3">
      <XStack gap="$2" flexWrap="wrap">
        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <User size="$2" />
              <YStack>
                <Paragraph size="$1">Customer Name</Paragraph>
                <Paragraph size="$2">{name}</Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        {orderNumber > 0 && (
          <Card>
            <Card.Header padding="$2.5">
              <XStack gap="$2" alignItems="center">
                <ConciergeBell size="$2" />
                <YStack>
                  <Paragraph size="$1">Order Number</Paragraph>
                  <Paragraph size="$2">{orderNumber}</Paragraph>
                </YStack>
              </XStack>
            </Card.Header>
          </Card>
        )}

        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <Calendar size="$2" />
              <YStack>
                <Paragraph size="$1">Transaction Date</Paragraph>
                <Paragraph size="$2">
                  {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
                </Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <CreditCard size="$2" />
              <YStack>
                <Paragraph size="$1">Paid At</Paragraph>
                <Paragraph size="$2">
                  {dayjs(paidAt).format('DD/MM/YYYY HH:mm')}
                </Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <CreditCard size="$2" />
              <YStack>
                <Paragraph size="$1">Paid Amount</Paragraph>
                <Paragraph size="$2" textTransform="none">
                  Rp. {paidAmount.toLocaleString('id')}
                </Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <CreditCard size="$2" />
              <YStack>
                <Paragraph size="$1">Change</Paragraph>
                <Paragraph size="$2" textTransform="none">
                  Rp. {(paidAmount - total).toLocaleString('id')}
                </Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card>
          <Card.Header padding="$2.5">
            <XStack gap="$2" alignItems="center">
              <Wallet size="$2" />
              <YStack>
                <Paragraph size="$1">Wallet</Paragraph>
                <Paragraph size="$2" textTransform="none">
                  {walletName}
                </Paragraph>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>
      </XStack>
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
                hidePrice
              />

              <XStack gap="$5" justifyContent="flex-end">
                <YStack>
                  <Paragraph textAlign="right" size="$2">
                    Note
                  </Paragraph>
                  <Paragraph textAlign="right">{note}</Paragraph>
                </YStack>
                <YStack>
                  <Paragraph textAlign="right" size="$2">
                    Price
                  </Paragraph>
                  <Paragraph textAlign="right">
                    Rp. {price.toLocaleString('id')}
                  </Paragraph>
                </YStack>
                <YStack>
                  <Paragraph textAlign="right" size="$2">
                    Amount
                  </Paragraph>
                  <Paragraph textAlign="right">{amount}</Paragraph>
                </YStack>
                {discountAmount > 0 && (
                  <YStack>
                    <Paragraph textAlign="right" size="$2">
                      Discount Amount
                    </Paragraph>
                    <Paragraph textAlign="right">
                      Rp. {discountAmount.toLocaleString('id')}
                    </Paragraph>
                  </YStack>
                )}

                <YStack>
                  <Paragraph textAlign="right" size="$2">
                    Subtotal
                  </Paragraph>
                  <Paragraph textAlign="right">
                    Rp. {subtotal.toLocaleString('id')}
                  </Paragraph>
                </YStack>
              </XStack>
            </YStack>
          )
        )}
      </YStack>

      {transactionCoupons.length > 0 && (
        <>
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
                    <Paragraph textAlign="right" size="$2">
                      Subtotal
                    </Paragraph>
                    <Paragraph textAlign="right">
                      - Rp. {getDiscountAmount(index).toLocaleString('id')}
                    </Paragraph>
                  </YStack>
                </XStack>
              </YStack>
            ))}
          </YStack>
        </>
      )}

      <YStack alignItems="flex-end">
        <Paragraph>Total</Paragraph>
        <H3>Rp. {total.toLocaleString('id')}</H3>
      </YStack>
    </YStack>
  );
};
