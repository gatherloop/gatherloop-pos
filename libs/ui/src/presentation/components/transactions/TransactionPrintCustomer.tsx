import { H5, Paragraph, Theme, XStack, YStack } from 'tamagui';
import { Transaction } from '../../../domain';
import dayjs from 'dayjs';

export type TransactionPrintCustomerProps = {
  name: string;
  createdAt: string;
  paidAt?: string;
  total: number;
  transactionItems: Transaction['transactionItems'];
};

export const TransactionPrintCustomer = ({
  name,
  paidAt,
  createdAt,
  total,
  transactionItems,
}: TransactionPrintCustomerProps) => {
  return (
    <Theme name="light">
      <YStack>
        <H5 textAlign="center" fontWeight="$16" fontSize="$1" lineHeight="$1">
          Gatherloop Cafe & Community
        </H5>

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <Paragraph fontWeight="$16" fontSize="$3">
          Waktu Transaksi
        </Paragraph>
        <Paragraph fontSize="$3">
          {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
        </Paragraph>

        {paidAt && (
          <>
            <Paragraph fontWeight="$16" fontSize="$3">
              Waktu Pembayaran
            </Paragraph>
            <Paragraph fontSize="$3">
              {dayjs(paidAt).format('DD/MM/YYYY HH:mm')}
            </Paragraph>
          </>
        )}

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <YStack gap="$2">
          {transactionItems.map(
            ({ id, price, product, amount, subtotal, discountAmount }) => (
              <YStack key={id}>
                <Paragraph fontWeight="$10" fontSize="$3">
                  {product.name}
                </Paragraph>
                <XStack gap="$2" justifyContent="space-between">
                  <Paragraph fontSize="$3">
                    {`${amount} x ${price.toLocaleString('id')}`}
                  </Paragraph>
                  <Paragraph
                    fontSize="$3"
                    fontWeight={discountAmount > 0 ? '$5' : '$16'}
                  >
                    Rp. {(price * amount).toLocaleString('id')}
                  </Paragraph>
                </XStack>

                {discountAmount > 0 && (
                  <>
                    <XStack gap="$2" justifyContent="space-between">
                      <Paragraph fontSize="$3">Diskon</Paragraph>
                      <Paragraph fontSize="$3">
                        - Rp. {discountAmount.toLocaleString('id')}
                      </Paragraph>
                    </XStack>

                    <XStack gap="$2" justifyContent="space-between">
                      <Paragraph fontSize="$3"></Paragraph>
                      <Paragraph fontSize="$3" fontWeight="$16">
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
          <Paragraph fontWeight="$16" fontSize="$3">
            Rp. {total.toLocaleString('id')}
          </Paragraph>
        </XStack>

        <Paragraph textAlign="center" fontSize="$3">
          Wifi : Gatherloop
        </Paragraph>
        <Paragraph textAlign="center" fontSize="$3">
          Password : kumpuldulu
        </Paragraph>

        <Paragraph textAlign="center" marginBottom="$2" fontSize="$3">
          Terimakasih Kak {name}
        </Paragraph>

        <Paragraph textAlign="center" fontSize="$3">
          Lihat event terbaru di instagram <b>@gatherloop</b>
        </Paragraph>
      </YStack>
    </Theme>
  );
};
