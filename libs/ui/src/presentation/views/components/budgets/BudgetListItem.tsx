import { Pencil, PercentSquare } from '@tamagui/lucide-icons';
import { ListItem } from '../base';

export type BudgetListItemProps = {
  id: number;
  name: string;
  percentage: number;
  onEditMenuPress?: () => void;
  onPress?: () => void;
};

export const BudgetListItem = ({
  name,
  percentage,
  onEditMenuPress,
  onPress,
}: BudgetListItemProps) => {
  return (
    <ListItem
      title={name}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: typeof onEditMenuPress === 'function',
        },
      ]}
      footerItems={[
        { label: 'Target', value: `${percentage}%`, icon: PercentSquare },
      ]}
      onPress={onPress}
    />
  );
};
