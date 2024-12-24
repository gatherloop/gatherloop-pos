import { PercentSquare } from '@tamagui/lucide-icons';
import { ListItem } from '../base';

export type BudgetListItemProps = {
  id: number;
  name: string;
  balance: number;
  percentage: number;
};

export const BudgetListItem = ({
  id,
  name,
  balance,
  percentage,
}: BudgetListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${balance.toLocaleString('id')}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      footerItems={
        id === 4 ? [] : [{ value: `${percentage}%`, icon: PercentSquare }]
      }
    />
  );
};
