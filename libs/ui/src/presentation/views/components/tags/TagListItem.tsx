import { Pencil, Trash } from '@tamagui/lucide-icons';
import { XStackProps } from 'tamagui';
import { ListItem } from '../base';
import { TagColor } from '../../../../domain';
import { TagColorPill } from './TagColorPill';

export type TagListItemProps = {
  name: string;
  color: TagColor;
  isHighlighted: boolean;
  variantCount: number;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
} & XStackProps;

export const TagListItem = ({
  name,
  color,
  isHighlighted,
  variantCount,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: TagListItemProps) => {
  return (
    <ListItem
      title={name}
      leading={<TagColorPill name={color} color={color} />}
      subtitle={`${variantCount} ${
        variantCount === 1 ? 'variant' : 'variants'
      }`}
      footerItems={[
        {
          label: 'Order app section',
          value: isHighlighted ? 'Highlighted' : 'Not highlighted',
        },
      ]}
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
