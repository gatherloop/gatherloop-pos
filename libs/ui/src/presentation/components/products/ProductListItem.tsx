import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type ProductListItemProps = {
  name: string;
  categoryName: string;
  imageUrl?: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const ProductListItem = ({
  name,
  categoryName,
  imageUrl,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ProductListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={categoryName}
      thumbnailSrc={imageUrl}
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
      {...xStackProps}
    />
  );
};
