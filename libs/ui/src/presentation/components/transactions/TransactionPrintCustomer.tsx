import { H5, Text, Theme, XStack, YStack } from 'tamagui';
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
      <YStack gap="$1.5">
        <H5 textAlign="center" fontWeight="$16" fontSize="$2" lineHeight="$1">
          Gatherloop Cafe & Community
        </H5>

        <YStack>
          <Text fontWeight="$16" fontSize="$1">
            Waktu Transaksi
          </Text>
          <Text fontSize="$1">
            {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        </YStack>

        {paidAt && (
          <YStack>
            <Text fontWeight="$16" fontSize="$1">
              Waktu Pembayaran
            </Text>
            <Text fontSize="$1">
              {dayjs(paidAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </YStack>
        )}

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <YStack>
          {transactionItems.map(
            ({ id, price, product, amount, subtotal, discountAmount }) => (
              <YStack key={id}>
                <Text fontWeight="$10" fontSize="$1">
                  {product.name}
                </Text>
                <XStack gap="$2" justifyContent="space-between">
                  <Text fontSize="$1">
                    {`${amount} x ${price.toLocaleString('id')}`}
                  </Text>
                  <Text
                    fontSize="$1"
                    fontWeight={discountAmount > 0 ? '$5' : '$16'}
                  >
                    Rp. {(price * amount).toLocaleString('id')}
                  </Text>
                </XStack>

                {discountAmount > 0 && (
                  <>
                    <XStack gap="$2" justifyContent="space-between">
                      <Text fontSize="$1">Diskon</Text>
                      <Text fontSize="$1">
                        - Rp. {discountAmount.toLocaleString('id')}
                      </Text>
                    </XStack>

                    <XStack gap="$2" justifyContent="space-between">
                      <Text fontSize="$1"></Text>
                      <Text fontSize="$1" fontWeight="$16">
                        Rp. {subtotal.toLocaleString('id')}
                      </Text>
                    </XStack>
                  </>
                )}
              </YStack>
            )
          )}
          <XStack justifyContent="space-between" marginTop="$2">
            <Text fontSize="$1">Total</Text>
            <Text fontWeight="$16" fontSize="$1">
              Rp. {total.toLocaleString('id')}
            </Text>
          </XStack>
        </YStack>

        <YStack borderWidth="$0.5" borderStyle="dashed" />

        <Text textAlign="center" fontSize="$1">
          Terimakasih Kak {name}
        </Text>

        <Text textAlign="center" fontSize="$1">
          Lihat event terbaru di Instagram <b>@gatherloop</b>
        </Text>

        <Text textAlign="center" fontSize="$1">
          Wifi : Gatherloop | Password : kumpuldulu
        </Text>
      </YStack>
    </Theme>
  );
};
