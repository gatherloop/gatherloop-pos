import { Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../../../base';
import { XStackProps } from 'tamagui';

export type ProductListItemProps = {
  name: string;
  price: number;
  categoryName: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const ProductListItem = ({
  name,
  price,
  categoryName,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ProductListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        {
          title: 'Edit',
          icon: Pencil,
          onPress: () => onEditMenuPress && onEditMenuPress(),
          isShown: () => typeof onEditMenuPress === 'function',
        },
        {
          title: 'Delete',
          icon: Trash,
          onPress: () => onDeleteMenuPress && onDeleteMenuPress(),
          isShown: () => typeof onDeleteMenuPress === 'function',
        },
      ]}
      footerItems={[{ value: categoryName, icon: Tag }]}
      {...xStackProps}
    />
  );
};
