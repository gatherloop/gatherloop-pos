package domain

import (
	"sort"
	"time"
)

type SaleType string

const (
	SaleTypePurchase SaleType = "purchase"
	SaleTypeRental   SaleType = "rental"
)

type ProductStatus string

const (
	ProductStatusDraft     ProductStatus = "draft"
	ProductStatusPublished ProductStatus = "published"
)

type AvailabilityTracking string

const (
	AvailabilityTrackingNone    AvailabilityTracking = "none"
	AvailabilityTrackingProduct AvailabilityTracking = "product"
	AvailabilityTrackingVariant AvailabilityTracking = "variant"
)

type Option struct {
	Id        int64
	ProductId int64
	Name      string
	Values    []OptionValue
}

type OptionValue struct {
	Id       int64
	OptionId int64
	Name     string
}

type Product struct {
	Id                   int64
	CategoryId           int64
	Name                 string
	Description          *string
	Recipe               *string
	Category             Category
	ImageUrl             string
	DeletedAt            *time.Time
	CreatedAt            time.Time
	Options              []Option
	SaleType             SaleType
	Status               ProductStatus
	IsAvailable          bool
	AvailabilityTracking AvailabilityTracking
	AvailableQuantity    *int
	Variants             []Variant
}

func (product Product) SellableQuantity() *int {
	if product.AvailabilityTracking == AvailabilityTrackingProduct {
		return product.AvailableQuantity
	}
	return nil
}

func (product Product) IsSellable() bool {
	isSellable := false
	for _, variant := range product.Variants {
		if variant.IsSellable() {
			isSellable = true
			break
		}
	}

	return isSellable
}

func (product Product) Tags() []ProductTag {
	liveVariantCount := 0
	productTags := []ProductTag{}
	indexByTagId := map[int64]int{}

	for _, variant := range product.Variants {
		if variant.DeletedAt != nil {
			continue
		}
		liveVariantCount++

		for _, variantTag := range variant.Tags {
			index, found := indexByTagId[variantTag.Tag.Id]
			if !found {
				index = len(productTags)
				indexByTagId[variantTag.Tag.Id] = index
				productTags = append(productTags, ProductTag{Tag: variantTag.Tag, VariantIds: []int64{}})
			}

			productTags[index].VariantIds = append(productTags[index].VariantIds, variant.Id)
			if variantTag.TaggedAt.After(productTags[index].TaggedAt) {
				productTags[index].TaggedAt = variantTag.TaggedAt
			}
		}
	}

	for i := range productTags {
		if len(productTags[i].VariantIds) == liveVariantCount {
			productTags[i].Scope = ProductTagScopeProduct
		} else {
			productTags[i].Scope = ProductTagScopeVariant
		}
	}

	sort.SliceStable(productTags, func(i, j int) bool {
		if productTags[i].Tag.SortOrder != productTags[j].Tag.SortOrder {
			return productTags[i].Tag.SortOrder < productTags[j].Tag.SortOrder
		}
		return productTags[i].Tag.Name < productTags[j].Tag.Name
	})

	return productTags
}
