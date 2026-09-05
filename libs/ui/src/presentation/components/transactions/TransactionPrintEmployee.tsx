import { Text, Theme, YStack } from 'tamagui';
import { TransactionItem } from '../../../domain';
import dayjs from 'dayjs';

// `TransactionItem[]` rather than `Transaction['transactionItems']`: Storybook's
// react-docgen cannot resolve an indexed access type and emits a prop node with
// no `elements`, which throws inside its argTypes conversion — a console error
// on every story of this component plus half-broken Controls.
export type TransactionPrintEmployeeProps = {
  id: number;
  name: string;
  createdAt: string;
  transactionItems: TransactionItem[];
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
        <Text fontSize="$4">ID Transaksi : {id}</Text>
        <Text fontSize="$4">Nama : {name}</Text>
        <Text fontSize="$4">Waktu Transaksi</Text>
        <Text fontSize="$4">{dayjs(createdAt).format('DD/MM/YYYY HH:mm')}</Text>
        <YStack borderWidth="$0.5" borderStyle="dashed" marginVertical="$2" />
        <YStack gap="$2">
          {transactionItems.map(({ id, productName, values, amount }) => (
            <YStack key={id}>
              <Text fontSize="$4">
                {productName} x {amount}
              </Text>
              {values.map((v) => (
                <Text key={v.id} fontSize="$4">
                  {v.optionName}: {v.optionValueName}
                </Text>
              ))}
            </YStack>
          ))}
        </YStack>
      </YStack>
    </Theme>
  );
};
