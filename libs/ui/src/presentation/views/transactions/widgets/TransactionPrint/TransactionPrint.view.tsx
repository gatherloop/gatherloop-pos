import { H4, H6, Paragraph, XStack, YStack } from 'tamagui';
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
    <YStack gap="$3">
      <H4>Gatherloop Cafe & Community</H4>
      <Paragraph>
        New Kraksaan Land, Blok G16, Karang Asem, Kebonagung, Kec. Kraksaan
      </Paragraph>

      <Paragraph>
        Waktu : {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
      </Paragraph>
      <YStack gap="$2">
        {transactionItems.map(({ id, product, amount, subtotal }) => (
          <XStack gap="$2" key={id}>
            <Paragraph size="$3" flexBasis="30%">
              {product.name}
            </Paragraph>
            <Paragraph size="$3" flexBasis="25%">
              Rp. {product.price.toLocaleString('id')}
            </Paragraph>
            <Paragraph size="$3" flexBasis="5%">
              {amount}
            </Paragraph>
            <Paragraph size="$3" flexBasis="25%">
              Rp. {subtotal.toLocaleString('id')}
            </Paragraph>
          </XStack>
        ))}
        <H6 textAlign="right">Total Rp. {total.toLocaleString('id')}</H6>
      </YStack>
      <H4 marginBottom="$5">Terimakasih</H4>
    </YStack>
  );
};
