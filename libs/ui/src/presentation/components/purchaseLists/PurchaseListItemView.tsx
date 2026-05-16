import { DollarSign, Package, ShoppingCart } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';
import { PurchaseListItem } from '../../../domain';

export type PurchaseListItemViewProps = {
  item: PurchaseListItem;
} & XStackProps;

export function PurchaseListItemView({
  item,
  ...xStackProps
}: PurchaseListItemViewProps) {
  return (
    <ListItem
      title={item.materialName}
      subtitle={`Buy ${item.purchaseQuantity} ${item.purchaseUnit}`}
      footerItems={[
        {
          value: `${item.currentStock} / ${item.minimumStock} / ${item.normalStock} ${item.purchaseUnit}`,
          icon: Package,
          label: 'Current / Min / Normal',
          isShown: true,
        },
        {
          value: `${item.purchaseQuantity} ${item.purchaseUnit}`,
          icon: ShoppingCart,
          label: 'To Buy',
          isShown: true,
        },
        {
          value: `Rp. ${item.estimatedCost.toLocaleString('id')}`,
          icon: DollarSign,
          label: 'Est. Cost',
          isShown: true,
        },
      ]}
      {...xStackProps}
    />
  );
}
