import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../../../base';

export type CategoryListItemProps = {
  name: string;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
};

export const CategoryListItem = ({
  name,
  onDeleteMenuPress,
  onEditMenuPress,
}: CategoryListItemProps) => {
  return (
    <ListItem
      title={name}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
    />
  );
};
