import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type TicketListItemProps = {
  code: string;
  name: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const TicketListItem = ({
  code,
  name,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: TicketListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={code}
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
