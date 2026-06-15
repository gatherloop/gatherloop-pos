import { ClipboardList, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem, Markdown } from '../base';
import { XStackProps, YStack } from 'tamagui';

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
      subtitle={
        description ? (
          <YStack theme="alt2" maxHeight={80} overflow="hidden">
            <Markdown content={description} />
          </YStack>
        ) : undefined
      }
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
