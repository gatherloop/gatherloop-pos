import { Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type VariantListItemProps = {
  name: string;
  price: number;
  categoryName: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const VariantListItem = ({
  name,
  price,
  categoryName,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: VariantListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      menus={[
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: typeof onEditMenuPress === 'function',
        },
        {
          title: 'Delete',
          icon: Trash,
          onPress: onDeleteMenuPress,
          isShown: typeof onDeleteMenuPress === 'function',
        },
      ]}
      footerItems={[{ value: categoryName, icon: Tag }]}
      {...xStackProps}
    />
  );
};
