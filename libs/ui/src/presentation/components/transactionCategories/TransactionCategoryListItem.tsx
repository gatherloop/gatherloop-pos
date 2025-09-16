import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type TransactionCategoryListItemProps = {
  name: string;
  type: 'checkout' | 'order';
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
} & XStackProps;

export const TransactionCategoryListItem = ({
  name,
  type,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: TransactionCategoryListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={type}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
