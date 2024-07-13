import { Tag } from '@tamagui/lucide-icons';
import { ListItem, ListItemMenu } from '../../../base';

export type ProductCardProps = {
  name: string;
  price: number;
  categoryName: string;
  onPress?: () => void;
  menus?: ListItemMenu[];
};

export const ProductCard = ({
  name,
  price,
  categoryName,
  menus,
  onPress,
}: ProductCardProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      thumbnailSrc="https://picsum.photos/500/300"
      onPress={onPress}
      menus={menus}
      footerItems={[{ value: categoryName, icon: Tag }]}
    />
  );
};
