import { Card, H3, H4, Paragraph, XStack, YStack } from 'tamagui';
import dayjs from 'dayjs';
import { ProductListItem } from '../../../products';
import { Calendar, CreditCard, User, Wallet } from '@tamagui/lucide-icons';
import { H5 } from 'tamagui';
import { Transaction } from '../../../../../domain';

export type TransactionDetailViewProps = {
  name: string;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  total: number;
  transactionItems: Transaction['transactionItems'];
};

export const TransactionDetailView = ({
  name,
  createdAt,
  paidAt,
  walletName,
  total,
  transactionItems,
}: TransactionDetailViewProps) => {
  return (
    <YStack gap="$3">
      <XStack gap="$3" $md={{ flexDirection: 'column' }}>
        <Card flex={1}>
          <Card.Header>
            <XStack gap="$3" alignItems="center">
              <User size="$3" />
              <YStack>
                <Paragraph>Customer Name</Paragraph>
                <H5 textTransform="none">{name}</H5>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card flex={1}>
          <Card.Header>
            <XStack gap="$3" alignItems="center">
              <Calendar size="$3" />
              <YStack>
                <Paragraph>Transaction Date</Paragraph>
                <H5 textTransform="none">
                  {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
                </H5>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card flex={1}>
          <Card.Header>
            <XStack gap="$3" alignItems="center">
              <CreditCard size="$3" />
              <YStack>
                <Paragraph>Paid At</Paragraph>
                <H5 textTransform="none">
                  {dayjs(paidAt).format('DD/MM/YYYY HH:mm')}
                </H5>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>

        <Card flex={1}>
          <Card.Header>
            <XStack gap="$3" alignItems="center">
              <Wallet size="$3" />
              <YStack>
                <Paragraph>Wallet</Paragraph>
                <H5 textTransform="none">{walletName}</H5>
              </YStack>
            </XStack>
          </Card.Header>
        </Card>
      </XStack>
      <H4>Transaction Items</H4>
      <YStack gap="$3">
        {transactionItems.map(({ price, product, amount }) => (
          <YStack key={product.id} gap="$3">
            <ProductListItem
              categoryName={product.category.name}
              name={product.name}
              price={price}
              flex={1}
            />

            <XStack gap="$5" justifyContent="flex-end">
              <YStack>
                <Paragraph textAlign="right">Price</Paragraph>
                <H4 textAlign="right">Rp. {price.toLocaleString('id')}</H4>
              </YStack>
              <YStack>
                <Paragraph textAlign="right">Amount</Paragraph>
                <H4 textAlign="right">{amount}</H4>
              </YStack>
              <YStack>
                <Paragraph textAlign="right">Subtotal</Paragraph>
                <H4 textAlign="right">
                  Rp. {(amount * price).toLocaleString('id')}
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
