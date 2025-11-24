import { Map, MapPin, Pencil, Phone, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type SupplierListItemProps = {
  name: string;
  phone?: string;
  address: string;
  mapsLink: string;
  onOpenMapMenuPress?: () => void;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export function SupplierListItem({
  name,
  phone,
  address,
  mapsLink,
  onOpenMapMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: SupplierListItemProps) {
  return (
    <ListItem
      title={name}
      menus={[
        {
          title: 'Open Map',
          icon: MapPin,
          onPress: onOpenMapMenuPress,
          isShown: typeof onOpenMapMenuPress === 'function',
        },
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
          value: phone || '',
          icon: Phone,
          label: 'PHONE',
          isShown: !!phone,
        },
        { value: address, icon: Map, label: 'ADDRESS' },
      ]}
      {...xStackProps}
    />
  );
}
