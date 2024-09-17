import { Box, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../../../base';
import { XStackProps } from 'tamagui';

export type MaterialListItemProps = {
  name: string;
  price: number;
  unit: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export function MaterialListItem({
  name,
  price,
  unit,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: MaterialListItemProps) {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        { title: 'Edit', icon: Pencil, onPress: () => onEditMenuPress && onEditMenuPress(), isShown: () => typeof onEditMenuPress === "function" },
        { title: 'Delete', icon: Trash, onPress: () => onDeleteMenuPress && onDeleteMenuPress(), isShown: () => typeof onDeleteMenuPress === "function" },
      ]}
      footerItems={[{ value: unit, icon: Box }]}
      {...xStackProps}
    />
  );
}
