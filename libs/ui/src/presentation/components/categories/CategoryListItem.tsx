import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';
import { CategoryStation } from '../../../domain';

const stationLabels: Record<CategoryStation, string> = {
  KITCHEN: 'Kitchen',
  BAR: 'Bar',
  NONE: 'None',
};

export type CategoryListItemProps = {
  name: string;
  station: CategoryStation;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
} & XStackProps;

export const CategoryListItem = ({
  name,
  station,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: CategoryListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Station: ${stationLabels[station]}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
