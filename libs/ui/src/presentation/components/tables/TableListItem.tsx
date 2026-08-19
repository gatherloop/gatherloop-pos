import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type TableListItemProps = {
  code: string;
  label: string;
  floorNumber: number;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const TableListItem = ({
  code,
  label,
  floorNumber,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: TableListItemProps) => {
  return (
    <ListItem
      title={label}
      subtitle={`Floor ${floorNumber} · ${code}`}
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
