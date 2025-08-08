import { Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type VariantListItemProps = {
  name: string;
  price: number;
  productName: string;
  productImageUrl: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const VariantListItem = ({
  name,
  price,
  productName,
  productImageUrl,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: VariantListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${price.toLocaleString('id')}`}
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
      footerItems={[{ value: productName, icon: Tag }]}
      {...xStackProps}
    />
  );
};
