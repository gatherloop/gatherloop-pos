import { MinusSquare } from '@tamagui/lucide-icons';
import { ListItem, ListItemMenu } from '../../../base';

export type WalletCardProps = {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  onPress?: () => void;
  menus?: ListItemMenu[];
};

export const WalletCard = ({
  name,
  balance,
  paymentCostPercentage,
  menus,
  onPress,
}: WalletCardProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${balance.toLocaleString('id')}`}
      thumbnailSrc="https://picsum.photos/200/300"
      onPress={onPress}
      menus={menus}
      footerItems={[{ value: `${paymentCostPercentage}%`, icon: MinusSquare }]}
    />
  );
};
