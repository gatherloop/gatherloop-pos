import { Text, Theme, YStack } from 'tamagui';
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
        <Text fontSize="$3">ID Transaksi : {id}</Text>
        <Text fontSize="$3">Nama : {name}</Text>
        <Text fontSize="$3">Waktu Transaksi</Text>
        <Text fontSize="$3">{dayjs(createdAt).format('DD/MM/YYYY HH:mm')}</Text>
        <YStack borderWidth="$0.5" borderStyle="dashed" marginVertical="$2" />
        <YStack gap="$2">
          {transactionItems.map(({ id, product, amount }) => (
            <Text key={id} fontSize="$3">
              {product.name} x {amount}
            </Text>
          ))}
        </YStack>
      </YStack>
    </Theme>
  );
};
