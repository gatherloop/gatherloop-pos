import { Wallet } from '@tamagui/lucide-icons';
import { Paragraph, XStack } from 'tamagui';
import { formatRupiah } from '../../../../utils/currency';

export type PayAtPickupBannerProps = {
  amount: number;
};

export const PayAtPickupBanner = ({ amount }: PayAtPickupBannerProps) => (
  <XStack
    backgroundColor="$orange2"
    padding="$3"
    borderRadius="$2"
    gap="$2"
    alignItems="center"
  >
    <Wallet size="$1" color="$orange10" />
    <Paragraph color="$orange10">
      {`Bayar ${formatRupiah(amount)} di kasir saat mengambil pesanan`}
    </Paragraph>
  </XStack>
);
