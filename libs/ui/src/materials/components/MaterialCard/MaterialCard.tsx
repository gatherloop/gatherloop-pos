import { Box } from '@tamagui/lucide-icons';
import { ListItem, ListItemMenu } from '../../../base';
import { XStackProps } from 'tamagui';

export type MaterialCardProps = {
  name: string;
  price: number;
  unit: string;
  onPress?: () => void;
  menus?: ListItemMenu[];
} & XStackProps;

export function MaterialCard({
  name,
  price,
  unit,
  onPress,
  menus,
  ...xStackProps
}: MaterialCardProps) {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      onPress={onPress}
      menus={menus}
      footerItems={[{ value: unit, icon: Box }]}
      {...xStackProps}
    />
  );
}
