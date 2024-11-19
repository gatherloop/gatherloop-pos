import { H4, H5, Paragraph, XStack, YStack } from 'tamagui';
import { Transaction } from '../../../../../domain';
import dayjs from 'dayjs';

export type TransactionPrintViewProps = {
  createdAt: string;
  total: number;
  transactionItems: Transaction['transactionItems'];
};

export const TransactionPrintView = ({
  createdAt,
  total,
  transactionItems,
}: TransactionPrintViewProps) => {
  return (
    <YStack gap="$3" padding="$3">
      <H4>Gatherloop Cafe & Community</H4>
      <Paragraph>
        New Kraksaan Land, Blok G16, Karang Asem, Kebonagung, Kec. Kraksaan
      </Paragraph>

      <Paragraph>
        Waktu : {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
      </Paragraph>
      <YStack gap="$3">
        {transactionItems.map(({ id, product, amount, subtotal }) => (
          <XStack gap="$3" key={id}>
            <Paragraph flex={1}>{product.name}</Paragraph>
            <Paragraph flex={1}>
              Rp. {product.price.toLocaleString('id')}
            </Paragraph>
            <Paragraph flex={1}>{amount}</Paragraph>
            <Paragraph flex={1}>Rp. {subtotal.toLocaleString('id')}</Paragraph>
          </XStack>
        ))}
        <H5>Total Rp. {total.toLocaleString('id')}</H5>
      </YStack>
    </YStack>
  );
};
