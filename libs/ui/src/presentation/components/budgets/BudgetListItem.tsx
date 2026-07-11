import { PercentSquare } from '@tamagui/lucide-icons';
import { ListItem } from '../base';

export type BudgetListItemProps = {
  id: number;
  name: string;
  percentage: number;
};

export const BudgetListItem = ({ name, percentage }: BudgetListItemProps) => {
  return (
    <ListItem
      title={name}
      thumbnailSrc="https://placehold.jp/120x120.png"
      footerItems={[
        { label: 'Target', value: `${percentage}%`, icon: PercentSquare },
      ]}
    />
  );
};
