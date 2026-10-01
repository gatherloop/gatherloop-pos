import { SizableText, XStack } from 'tamagui';
import { ProductTag } from '../../../../domain';
import { buildProductTagBadges } from '../../../../utils/buildProductTagBadges';
import { TagBadge } from './TagBadge';

export type ProductTagBadgesProps = {
  tags: ProductTag[];
  variantNameById?: Record<number, string>;
};

export const ProductTagBadges = ({
  tags,
  variantNameById,
}: ProductTagBadgesProps) => {
  const { badges, overflowCount } = buildProductTagBadges(
    tags,
    variantNameById
  );

  if (badges.length === 0) return null;

  return (
    <XStack gap="$1" flexWrap="wrap" alignItems="center">
      {badges.map((badge) => (
        <TagBadge key={badge.key} label={badge.label} color={badge.color} />
      ))}
      {overflowCount > 0 && (
        <SizableText size="$1" color="$color10">
          +{overflowCount}
        </SizableText>
      )}
    </XStack>
  );
};
