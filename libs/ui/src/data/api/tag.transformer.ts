// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Tag as ApiTag,
  ProductTag as ApiProductTag,
} from '../../../../api-contract/src';
import { ProductTag, Tag, TagForm } from '../../domain';

export function toTag(tag: ApiTag): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isHighlighted: tag.isHighlighted,
    sortOrder: tag.sortOrder,
    variantCount: tag.variantCount ?? 0,
    createdAt: tag.createdAt,
  };
}

export function toProductTag(productTag: ApiProductTag): ProductTag {
  return {
    tag: toTag(productTag.tag),
    scope: productTag.scope,
    variantIds: productTag.variantIds,
    taggedAt: productTag.taggedAt,
  };
}

export function toApiTag(form: TagForm) {
  return {
    name: form.name,
    color: form.color,
    isHighlighted: form.isHighlighted,
    sortOrder: form.sortOrder,
  };
}
