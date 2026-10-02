import { Product, Tag, Variant } from '../domain/entities';

export type TagHighlightEntry =
  | { kind: 'product'; product: Product }
  | { kind: 'variant'; product: Product; variant: Variant };

export type TagHighlight = {
  tag: Tag;
  entries: TagHighlightEntry[];
};

type RankedEntry = {
  entry: TagHighlightEntry;
  taggedAt: number;
  productIndex: number;
  variantIndex: number;
};

export function buildTagHighlights(
  products: Product[],
  variants: Variant[]
): TagHighlight[] {
  const variantIndexById = new Map(
    variants.map((variant, index) => [variant.id, index])
  );
  const rankedEntriesByTagId = new Map<number, RankedEntry[]>();
  const tagsById = new Map<number, Tag>();

  products.forEach((product, productIndex) => {
    for (const productTag of product.tags) {
      if (!productTag.tag.isHighlighted) continue;

      const rankedEntries: RankedEntry[] = [];

      if (productTag.scope === 'product') {
        if (product.isSellable) {
          rankedEntries.push({
            entry: { kind: 'product', product },
            taggedAt: Date.parse(productTag.taggedAt),
            productIndex,
            variantIndex: -1,
          });
        }
      } else {
        for (const variantId of productTag.variantIds) {
          const variantIndex = variantIndexById.get(variantId);
          if (variantIndex === undefined) continue;
          const variant = variants[variantIndex];
          if (!variant.isSellable) continue;
          const variantTag = variant.tags.find(
            ({ tag }) => tag.id === productTag.tag.id
          );
          rankedEntries.push({
            entry: { kind: 'variant', product, variant },
            taggedAt: Date.parse(variantTag?.taggedAt ?? productTag.taggedAt),
            productIndex,
            variantIndex,
          });
        }
      }

      if (rankedEntries.length === 0) continue;
      tagsById.set(productTag.tag.id, productTag.tag);
      rankedEntriesByTagId.set(productTag.tag.id, [
        ...(rankedEntriesByTagId.get(productTag.tag.id) ?? []),
        ...rankedEntries,
      ]);
    }
  });

  return [...rankedEntriesByTagId.entries()]
    .map(([tagId, rankedEntries]) => ({
      tag: tagsById.get(tagId) as Tag,
      entries: [...rankedEntries]
        .sort(
          (a, b) =>
            b.taggedAt - a.taggedAt ||
            a.productIndex - b.productIndex ||
            a.variantIndex - b.variantIndex
        )
        .map(({ entry }) => entry),
    }))
    .sort((a, b) => a.tag.sortOrder - b.tag.sortOrder || a.tag.id - b.tag.id);
}
