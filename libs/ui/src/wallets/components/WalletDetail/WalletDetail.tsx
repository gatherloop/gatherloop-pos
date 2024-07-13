import { WalletCard } from '../WalletCard';
import { useWalletDetailState } from './WalletDetail.state';

export type WalletDetailProps = {
  walletId: number;
};

export const WalletDetail = ({ walletId }: WalletDetailProps) => {
  const { data } = useWalletDetailState({ walletId });
  return (
    <WalletCard
      balance={data?.data.balance ?? 0}
      name={data?.data.name ?? ''}
      paymentCostPercentage={data?.data.paymentCostPercentage ?? 0}
    />
  );
};
