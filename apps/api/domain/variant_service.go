package domain

import (
	"apps/api/utils"
	"context"
)

type VariantService struct {
	tagRepoPort TagRepoPort
	tagService  TagService
}

func NewVariantService(tagRepoPort TagRepoPort, tagService TagService) VariantService {
	return VariantService{
		tagRepoPort: tagRepoPort,
		tagService:  tagService,
	}
}

func (service VariantService) ValidateTagIds(ctx context.Context, tagIds []int64) *Error {
	tags, err := service.tagRepoPort.GetTagList(ctx)
	if err != nil {
		return err
	}
	knownTagIds := map[int64]bool{}
	for _, tag := range tags {
		knownTagIds[tag.Id] = true
	}
	for _, tagId := range tagIds {
		if !knownTagIds[tagId] {
			return &Error{Type: BadRequest, Message: "tag ids contain unknown tags"}
		}
	}
	return nil
}

func (service VariantService) ReplaceVariantTags(ctx context.Context, variantId int64, tagIds []int64) *Error {
	existingTagIds, err := service.tagRepoPort.GetVariantTagIds(ctx, variantId)
	if err != nil {
		return err
	}

	toVariantPairs := func(ids []int64) []VariantTagPair {
		pairs := []VariantTagPair{}
		for _, tagId := range utils.UniqueInt64s(ids) {
			pairs = append(pairs, VariantTagPair{VariantId: variantId, TagId: tagId})
		}
		return pairs
	}

	return service.tagService.ApplyVariantTagPairs(ctx, toVariantPairs(existingTagIds), toVariantPairs(tagIds))
}

func (service VariantService) ValidateVariantForSaleType(saleType SaleType, variant *Variant) *Error {
	switch saleType {
	case SaleTypePurchase:
		if variant.Price <= 0 {
			return &Error{Type: BadRequest, Message: "purchase variant must have price > 0"}
		}
		if len(variant.PricingTiers) > 0 {
			return &Error{Type: BadRequest, Message: "purchase variant cannot have pricing tiers"}
		}
	case SaleTypeRental:
		variant.Price = 0
		if len(variant.PricingTiers) == 0 {
			return &Error{Type: BadRequest, Message: "rental variant must have at least one pricing tier"}
		}
		for i, tier := range variant.PricingTiers {
			if tier.UpToMinutes <= 0 {
				return &Error{Type: BadRequest, Message: "pricing tier up_to_minutes must be positive"}
			}
			if tier.Price < 0 {
				return &Error{Type: BadRequest, Message: "pricing tier price must be non-negative"}
			}
			if i > 0 && tier.UpToMinutes <= variant.PricingTiers[i-1].UpToMinutes {
				return &Error{Type: BadRequest, Message: "pricing tier up_to_minutes must be strictly ascending"}
			}
		}
	}
	return nil
}
