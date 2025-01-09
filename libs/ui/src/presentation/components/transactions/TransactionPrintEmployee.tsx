import { Paragraph, Theme, YStack } from 'tamagui';
import { Transaction } from '../../../domain';
import dayjs from 'dayjs';

export type TransactionPrintEmployeeProps = {
  id: number;
  name: string;
  createdAt: string;
  transactionItems: Transaction['transactionItems'];
};

export const TransactionPrintEmployee = ({
  id,
  name,
  createdAt,
  transactionItems,
}: TransactionPrintEmployeeProps) => {
  return (
    <Theme name="light">
      <YStack>
        <Paragraph>ID Transaksi : {id}</Paragraph>
        <Paragraph>Nama : {name}</Paragraph>
        <Paragraph fontWeight="$16">Waktu Transaksi</Paragraph>
        <Paragraph>{dayjs(createdAt).format('DD/MM/YYYY HH:mm')}</Paragraph>

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        {transactionItems.map(({ id, product, amount }) => (
          <Paragraph key={id}>
            {product.name} x {amount}
          </Paragraph>
        ))}
      </YStack>
    </Theme>
  );
};
