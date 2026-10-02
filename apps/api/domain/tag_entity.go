package domain

import (
	"sort"
	"time"
)

type TagColor string

const (
	TagColorRed    TagColor = "red"
	TagColorOrange TagColor = "orange"
	TagColorYellow TagColor = "yellow"
	TagColorGreen  TagColor = "green"
	TagColorBlue   TagColor = "blue"
	TagColorPurple TagColor = "purple"
	TagColorPink   TagColor = "pink"
	TagColorGray   TagColor = "gray"
)

func (color TagColor) IsValid() bool {
	switch color {
	case TagColorRed, TagColorOrange, TagColorYellow, TagColorGreen,
		TagColorBlue, TagColorPurple, TagColorPink, TagColorGray:
		return true
	}
	return false
}

type Tag struct {
	Id            int64
	Name          string
	Color         TagColor
	IsHighlighted bool
	SortOrder     int
	VariantCount  int64
	CreatedAt     time.Time
}

type VariantTag struct {
	Tag      Tag
	TaggedAt time.Time
}

type VariantTagPair struct {
	VariantId int64
	TagId     int64
}

type ProductTagScope string

const (
	ProductTagScopeProduct ProductTagScope = "product"
	ProductTagScopeVariant ProductTagScope = "variant"
)

type ProductTag struct {
	Tag        Tag
	Scope      ProductTagScope
	VariantIds []int64
	TaggedAt   time.Time
}

func ResolveProductTags(variants []Variant) []ProductTag {
	liveVariantCount := 0
	productTags := []ProductTag{}
	indexByTagId := map[int64]int{}

	for _, variant := range variants {
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
