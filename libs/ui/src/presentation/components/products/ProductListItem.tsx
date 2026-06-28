import { FileText, Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';
import { ProductStatus } from '../../../domain';

export type ProductListItemProps = {
  name: string;
  saleType: 'purchase' | 'rental';
  status: ProductStatus;
  categoryName: string;
  imageUrl?: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const ProductListItem = ({
  name,
  categoryName,
  saleType,
  status,
  imageUrl,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ProductListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={categoryName}
      thumbnailSrc={imageUrl}
      footerItems={[
        {
          icon: Tag,
          label: 'SALE TYPE',
          value: saleType === 'purchase' ? 'Purchase' : 'Rental',
        },
        {
          icon: FileText,
          label: 'STATUS',
          value: status === 'draft' ? 'Draft' : 'Published',
        },
      ]}
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
      {...xStackProps}
    />
  );
};
