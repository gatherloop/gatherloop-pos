import { ProductTag, TagColor } from '../domain/entities';

export const MAX_TAG_BADGES = 2;

export type TagBadgeItem = {
  key: string;
  label: string;
  color: TagColor;
};

export type TagBadges = {
  badges: TagBadgeItem[];
  overflowCount: number;
};

const buildLabel = (
  productTag: ProductTag,
  variantNameById: Record<number, string>
) => {
  if (productTag.scope === 'product') return productTag.tag.name;

  if (productTag.variantIds.length === 1) {
    const variantName = variantNameById[productTag.variantIds[0]];
    if (variantName) return `${productTag.tag.name} · ${variantName}`;
  }

  return `${productTag.tag.name} · ${productTag.variantIds.length} varian`;
};

export function buildTagBadges(
  tags: ProductTag[],
  variantNameById: Record<number, string> = {}
): TagBadges {
  const sortedTags = [...tags].sort(
    (a, b) =>
      a.tag.sortOrder - b.tag.sortOrder || a.tag.name.localeCompare(b.tag.name)
  );

  return {
    badges: sortedTags.slice(0, MAX_TAG_BADGES).map((productTag) => ({
      key: String(productTag.tag.id),
      label: buildLabel(productTag, variantNameById),
      color: productTag.tag.color,
    })),
    overflowCount: Math.max(sortedTags.length - MAX_TAG_BADGES, 0),
  };
}
