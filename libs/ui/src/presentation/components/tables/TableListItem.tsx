import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type TableListItemProps = {
  code: string;
  label: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const TableListItem = ({
  code,
  label,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: TableListItemProps) => {
  return (
    <ListItem
      title={label}
      subtitle={code}
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
