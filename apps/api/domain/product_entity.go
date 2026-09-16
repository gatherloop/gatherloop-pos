package domain

import (
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
	IsSellable           bool
	RemainingQuantity    *int
}

func ResolveProductAvailability(product Product, variants []Variant) (isSellable bool, remaining *int) {
	remaining = productRemainingQuantity(product)

	for _, variant := range variants {
		variantIsSellable, _ := ResolveVariantAvailability(product, variant)
		if variantIsSellable {
			isSellable = true
			break
		}
	}

	return isSellable, remaining
}

func productRemainingQuantity(product Product) *int {
	if product.AvailabilityTracking == AvailabilityTrackingProduct {
		return product.AvailableQuantity
	}
	return nil
}

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
