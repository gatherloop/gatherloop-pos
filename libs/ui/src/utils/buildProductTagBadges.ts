import { ProductTag, TagColor } from '../domain/entities';

export const MAX_VISIBLE_TAG_BADGES = 2;

export type ProductTagBadge = {
  key: number;
  label: string;
  color: TagColor;
};

export type ProductTagBadges = {
  badges: ProductTagBadge[];
  overflowCount: number;
};

function buildLabel(
  productTag: ProductTag,
  variantNameById: Record<number, string>
): string {
  if (productTag.scope === 'product') return productTag.tag.name;
  if (productTag.variantIds.length === 1) {
    const variantName = variantNameById[productTag.variantIds[0]];
    return variantName
      ? `${productTag.tag.name} · ${variantName}`
      : productTag.tag.name;
  }
  return `${productTag.tag.name} · ${productTag.variantIds.length} varian`;
}

export function buildProductTagBadges(
  tags: ProductTag[],
  variantNameById: Record<number, string> = {}
): ProductTagBadges {
  const sorted = [...tags].sort(
    (a, b) => a.tag.sortOrder - b.tag.sortOrder || a.tag.id - b.tag.id
  );

  return {
    badges: sorted.slice(0, MAX_VISIBLE_TAG_BADGES).map((productTag) => ({
      key: productTag.tag.id,
      label: buildLabel(productTag, variantNameById),
      color: productTag.tag.color,
    })),
    overflowCount: Math.max(sorted.length - MAX_VISIBLE_TAG_BADGES, 0),
  };
}
