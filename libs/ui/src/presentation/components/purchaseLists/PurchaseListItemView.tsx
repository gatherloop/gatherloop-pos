import { DollarSign, Globe, Package, ShoppingCart, Store } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { SizableText, XStack, XStackProps, YStack } from 'tamagui';
import { PurchaseListItem } from '../../../domain';

export type PurchaseListItemViewProps = {
  item: PurchaseListItem;
} & XStackProps;

export function PurchaseListItemView({
  item,
  ...xStackProps
}: PurchaseListItemViewProps) {
  return (
    <YStack gap="$1">
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
      {item.suppliers && item.suppliers.length > 0 && (
        <XStack gap="$3" paddingHorizontal="$3" paddingBottom="$2" flexWrap="wrap">
          {item.suppliers.map((supplier) => (
            <XStack key={supplier.id} gap="$1" alignItems="center">
              {supplier.isOnline ? (
                <Globe size={12} color="$blue9" />
              ) : (
                <Store size={12} color="$green9" />
              )}
              <SizableText
                size="$2"
                color={supplier.isOnline ? '$blue9' : '$green9'}
              >
                {supplier.name}
              </SizableText>
            </XStack>
          ))}
        </XStack>
      )}
    </YStack>
  );
}
