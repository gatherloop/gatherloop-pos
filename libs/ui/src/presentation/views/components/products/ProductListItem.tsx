import { FileText, Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { Paragraph, XStack, XStackProps, YStack } from 'tamagui';
import { ProductStatus } from '../../../../domain';

export type ProductListItemProps = {
  name: string;
  saleType: 'purchase' | 'rental';
  status: ProductStatus;
  categoryName: string;
  imageUrl?: string;
  isSoldOut?: boolean;
  remainingQuantity?: number;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

const SoldOutBadge = () => (
  <XStack
    backgroundColor="$red5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$red11">
      Sold out
    </Paragraph>
  </XStack>
);

const RemainingQuantityBadge = ({ value }: { value: number }) => (
  <XStack
    backgroundColor="$orange5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$orange11">
      {value} left
    </Paragraph>
  </XStack>
);

export const ProductListItem = ({
  name,
  categoryName,
  saleType,
  status,
  imageUrl,
  isSoldOut,
  remainingQuantity,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ProductListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={
        <YStack gap="$1.5">
          <Paragraph textTransform="none" ellipse size="$6">
            {categoryName}
          </Paragraph>
          {isSoldOut ? (
            <SoldOutBadge />
          ) : (
            remainingQuantity !== undefined && (
              <RemainingQuantityBadge value={remainingQuantity} />
            )
          )}
        </YStack>
      }
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
      opacity={isSoldOut ? 0.55 : xStackProps.opacity ?? 1}
    />
  );
};
