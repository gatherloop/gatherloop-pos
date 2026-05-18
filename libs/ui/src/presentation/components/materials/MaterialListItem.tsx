import { Box, Layers, Pencil, ShoppingCart, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type MaterialListItemProps = {
  name: string;
  price: number;
  unit: string;
  weeklyUsage: number;
  purchaseUnit: string;
  minimumStock: number;
  normalStock: number;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export function MaterialListItem({
  name,
  price,
  unit,
  weeklyUsage,
  purchaseUnit,
  minimumStock,
  normalStock,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: MaterialListItemProps) {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
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
          value: weeklyUsage.toString(),
          icon: ShoppingCart,
          label: 'Weekly Usage',
          isShown: weeklyUsage > 0,
        },
        { value: unit, icon: Box, label: 'Unit' },
        {
          value: purchaseUnit,
          icon: Layers,
          label: 'Purchase Unit',
          isShown: purchaseUnit.length > 0,
        },
        {
          value: `${minimumStock} / ${normalStock}`,
          icon: Layers,
          label: 'Min / Normal Stock',
          isShown: normalStock > 0,
        },
      ]}
      {...xStackProps}
    />
  );
}
