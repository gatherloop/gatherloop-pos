import { Tag } from '@tamagui/lucide-icons';
import { ListItem, ListItemMenu } from '../../../base';
import { XStackProps } from 'tamagui';

export type ProductCardProps = {
  name: string;
  price: number;
  categoryName: string;
  onPress?: () => void;
  menus?: ListItemMenu[];
} & XStackProps;

export const ProductCard = ({
  name,
  price,
  categoryName,
  menus,
  onPress,
  ...xStackProps
}: ProductCardProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      thumbnailSrc="https://picsum.photos/500/300"
      onPress={onPress}
      menus={menus}
      footerItems={[{ value: categoryName, icon: Tag }]}
      {...xStackProps}
    />
  );
};
