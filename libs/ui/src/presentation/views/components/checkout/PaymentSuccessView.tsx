import { CheckCircle } from '@tamagui/lucide-icons';
import { Paragraph, Text, YStack } from 'tamagui';
import { formatRupiah } from '../../../../utils/currency';

export type PaymentSuccessViewProps = {
  amount: number;
  customerName: string;
};

// FR-9/UX step 5: shown for ~2s before `CheckoutHandler` redirects to the
// status screen — an instant redirect would make a guest doubt the payment
// landed.
export const PaymentSuccessView = ({
  amount,
  customerName,
}: PaymentSuccessViewProps) => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
    <CheckCircle size="$6" color="$green10" />
    <Text fontWeight="bold" fontSize="$7">
      Pembayaran berhasil
    </Text>
    <Paragraph textAlign="center" fontWeight="bold" fontSize="$6">
      {formatRupiah(amount)}
    </Paragraph>
    <Paragraph textAlign="center" color="$color10">
      Atas nama {customerName}
    </Paragraph>
  </YStack>
);
