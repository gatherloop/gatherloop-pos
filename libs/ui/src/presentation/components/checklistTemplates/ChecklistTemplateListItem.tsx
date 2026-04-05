import { ClipboardList, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type ChecklistTemplateListItemProps = {
  name: string;
  description?: string;
  itemCount: number;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export function ChecklistTemplateListItem({
  name,
  description,
  itemCount,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ChecklistTemplateListItemProps) {
  return (
    <ListItem
      title={name}
      subtitle={description}
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
      footerItems={[
        {
          value: `${itemCount} items`,
          icon: ClipboardList,
          label: 'ITEMS',
        },
      ]}
      {...xStackProps}
    />
  );
}
