import { DollarSign, Globe, MapPin, Package, Phone, ShoppingCart, Store } from '@tamagui/lucide-icons';
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
      {item.materialSuppliers && item.materialSuppliers.length > 0 && (
        <YStack gap="$1" paddingHorizontal="$3" paddingBottom="$2">
          {item.materialSuppliers.map((ms) => (
            <YStack key={ms.supplierId} gap="$1">
              <XStack gap="$2" alignItems="center">
                {ms.purchaseType === 'online' ? (
                  <Globe size={14} color="$blue9" />
                ) : ms.purchaseType === 'delivery' ? (
                  <Phone size={14} color="$orange9" />
                ) : (
                  <Store size={14} color="$green9" />
                )}
                <SizableText
                  size="$3"
                  fontWeight="bold"
                  color={
                    ms.purchaseType === 'online'
                      ? '$blue9'
                      : ms.purchaseType === 'delivery'
                      ? '$orange9'
                      : '$green9'
                  }
                >
                  {ms.supplierName}
                </SizableText>
                <SizableText size="$2" color="$gray10">
                  ({ms.purchaseType})
                </SizableText>
              </XStack>
              {ms.purchaseType === 'offline' && ms.address ? (
                <XStack gap="$1" alignItems="center" paddingLeft="$5">
                  <MapPin size={12} color="$gray10" />
                  <SizableText size="$2" color="$gray10">
                    {ms.address}
                  </SizableText>
                </XStack>
              ) : ms.purchaseType === 'online' && ms.purchaseUrl ? (
                <SizableText size="$2" color="$blue9" paddingLeft="$5">
                  {ms.purchaseUrl}
                </SizableText>
              ) : ms.purchaseType === 'delivery' && ms.phone ? (
                <XStack gap="$1" alignItems="center" paddingLeft="$5">
                  <Phone size={12} color="$gray10" />
                  <SizableText size="$2" color="$gray10">
                    {ms.phone}
                  </SizableText>
                </XStack>
              ) : null}
            </YStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
