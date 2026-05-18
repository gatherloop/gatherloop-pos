import { Calendar, ClipboardList, Eye, Pencil, ShoppingCart, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';
import { StockCheck } from '../../../domain';

export type StockCheckListItemProps = {
  stockCheck: StockCheck;
  onViewMenuPress?: () => void;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
  onViewPurchaseListMenuPress?: () => void;
} & XStackProps;

export function StockCheckListItem({
  stockCheck,
  onViewMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onViewPurchaseListMenuPress,
  ...xStackProps
}: StockCheckListItemProps) {
  const date = new Date(stockCheck.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ListItem
      title={date}
      subtitle={`${stockCheck.items.length} material(s)`}
      menus={[
        {
          title: 'View',
          icon: Eye,
          onPress: onViewMenuPress,
          isShown: typeof onViewMenuPress === 'function',
        },
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: typeof onEditMenuPress === 'function',
        },
        {
          title: 'View Purchase List',
          icon: ShoppingCart,
          onPress: onViewPurchaseListMenuPress,
          isShown: typeof onViewPurchaseListMenuPress === 'function',
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
          value: date,
          icon: Calendar,
          label: 'Date',
          isShown: true,
        },
        {
          value: stockCheck.items.length.toString(),
          icon: ClipboardList,
          label: 'Items',
          isShown: true,
        },
      ]}
      {...xStackProps}
    />
  );
}
