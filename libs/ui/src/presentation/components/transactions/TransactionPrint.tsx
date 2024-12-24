import { H5, Paragraph, XStack, YStack } from 'tamagui';
import { Transaction } from '../../../domain';
import dayjs from 'dayjs';

export type TransactionPrintProps = {
  name: string;
  createdAt: string;
  paidAt: string;
  total: number;
  transactionItems: Transaction['transactionItems'];
};

export const TransactionPrint = ({
  name,
  paidAt,
  createdAt,
  total,
  transactionItems,
}: TransactionPrintProps) => {
  return (
    <YStack gap="$3">
      <YStack borderWidth="$0.5" borderStyle="dashed" />
      <H5 textAlign="center">Gatherloop Cafe & Community</H5>
      <Paragraph textAlign="center">
        New Kraksaan Land, Blok G16, Karang Asem, Kebonagung, Kec. Kraksaan
      </Paragraph>

      <YStack borderWidth="$0.5" borderStyle="dashed" />

      <Paragraph>
        Waktu Transaksi : {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
      </Paragraph>

      <Paragraph>
        Waktu Pembayaran : {dayjs(paidAt).format('DD/MM/YYYY HH:mm')}
      </Paragraph>

      <YStack borderWidth="$0.5" borderStyle="dashed" />

      <YStack gap="$2">
        {transactionItems.map(({ id, product, amount, subtotal }) => (
          <YStack key={id}>
            <Paragraph fontWeight="$10">{product.name}</Paragraph>
            <XStack gap="$2" justifyContent="space-between">
              <Paragraph size="$3">
                {amount} x Rp. {product.price.toLocaleString('id')}
              </Paragraph>
              <Paragraph size="$3">
                Rp. {subtotal.toLocaleString('id')}
              </Paragraph>
            </XStack>
          </YStack>
        ))}
        <YStack borderWidth="$0.5" borderStyle="dashed" />
      </YStack>

      <XStack justifyContent="space-between">
        <Paragraph>Total</Paragraph>
        <Paragraph>Rp. {total.toLocaleString('id')}</Paragraph>
      </XStack>

      <Paragraph textAlign="center">Wifi : Gatherloop</Paragraph>
      <Paragraph textAlign="center">Password : kumpuldulu</Paragraph>

      <Paragraph textAlign="center">
        Jangan lupa follow instagram kami untuk <b>melihat event terbaru</b> di
        @gatherloop
      </Paragraph>
      <Paragraph textAlign="center" marginBottom="$2">
        Terimakasih Kak {name}
      </Paragraph>

      <YStack borderWidth="$0.5" borderStyle="dashed" />
    </YStack>
  );
};
