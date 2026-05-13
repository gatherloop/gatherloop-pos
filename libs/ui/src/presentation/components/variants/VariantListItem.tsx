import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';
import { OptionValue, ProductSaleType } from '../../../domain';

export type VariantListItemProps = {
  price: number;
  productName: string;
  productSaleType: ProductSaleType;
  productImageUrl: string;
  optionValues: OptionValue[];
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const VariantListItem = ({
  price,
  productName,
  productSaleType,
  productImageUrl,
  optionValues,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: VariantListItemProps) => {
  return (
    <ListItem
      title={productName}
      subtitle={optionValues.map((value) => value.name).join(' - ')}
      thumbnailSrc={productImageUrl}
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
      footerItems={
        productSaleType === 'purchase'
          ? [{ value: `Rp. ${price.toLocaleString('id')}` }]
          : []
      }
      {...xStackProps}
    />
  );
};
