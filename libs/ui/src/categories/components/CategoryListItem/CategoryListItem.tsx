import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../../../base';
import { XStackProps } from 'tamagui';

export type CategoryListItemProps = {
  name: string;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
} & XStackProps;

export const CategoryListItem = ({
  name,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: CategoryListItemProps) => {
  return (
    <ListItem
      title={name}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
