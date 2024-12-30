import { H5, Paragraph, Theme, XStack, YStack } from 'tamagui';
import { Transaction } from '../../../domain';
import dayjs from 'dayjs';

export type TransactionPrintProps = {
  name: string;
  createdAt: string;
  paidAt?: string;
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
    <Theme name="light">
      <YStack gap="$2">
        <YStack borderWidth="$0.5" borderStyle="dashed" />
        <H5 textAlign="center" fontWeight="$16">
          Gatherloop Cafe & Community
        </H5>
        <Paragraph textAlign="center">
          New Kraksaan Land, Blok G16, Karang Asem, Kebonagung, Kec. Kraksaan
        </Paragraph>

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <Paragraph fontWeight="$16">Waktu Transaksi</Paragraph>
        <Paragraph>{dayjs(createdAt).format('DD/MM/YYYY HH:mm')}</Paragraph>

        {paidAt && (
          <>
            <Paragraph fontWeight="$16">Waktu Pembayaran</Paragraph>
            <Paragraph>{dayjs(paidAt).format('DD/MM/YYYY HH:mm')}</Paragraph>
          </>
        )}

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <YStack gap="$2">
          {transactionItems.map(
            ({ id, price, product, amount, subtotal, discountAmount }) => (
              <YStack key={id}>
                <Paragraph fontWeight="$10">{product.name}</Paragraph>
                <XStack gap="$2" justifyContent="space-between">
                  <Paragraph size="$3">
                    {`${amount} x ${price.toLocaleString('id')}`}
                  </Paragraph>
                  <Paragraph
                    size="$3"
                    fontWeight={discountAmount > 0 ? '$5' : '$16'}
                  >
                    Rp. {(price * amount).toLocaleString('id')}
                  </Paragraph>
                </XStack>

                {discountAmount > 0 && (
                  <>
                    <XStack gap="$2" justifyContent="space-between">
                      <Paragraph size="$3">Diskon</Paragraph>
                      <Paragraph size="$3">
                        - Rp. {discountAmount.toLocaleString('id')}
                      </Paragraph>
                    </XStack>

                    <XStack gap="$2" justifyContent="space-between">
                      <Paragraph size="$3"></Paragraph>
                      <Paragraph size="$3" fontWeight="$16">
                        Rp. {subtotal.toLocaleString('id')}
                      </Paragraph>
                    </XStack>
                  </>
                )}
              </YStack>
            )
          )}
          <YStack borderWidth="$0.5" borderStyle="dashed" />
        </YStack>

        <XStack justifyContent="space-between">
          <Paragraph>Total</Paragraph>
          <Paragraph fontWeight="$16">
            Rp. {total.toLocaleString('id')}
          </Paragraph>
        </XStack>

        <Paragraph textAlign="center">Wifi : Gatherloop</Paragraph>
        <Paragraph textAlign="center">Password : kumpuldulu</Paragraph>

        <Paragraph textAlign="center" marginBottom="$2">
          Terimakasih Kak {name}
        </Paragraph>

        <Paragraph textAlign="center">
          Jangan lupa follow instagram kami untuk <b>melihat event terbaru</b>{' '}
          di @gatherloop
        </Paragraph>

        <YStack borderWidth="$0.5" borderStyle="dashed" />
      </YStack>
    </Theme>
  );
};
