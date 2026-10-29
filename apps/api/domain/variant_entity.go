package domain

import "time"

type PricingTier struct {
	Id          int64
	VariantId   int64
	UpToMinutes int64
	Price       float32
	CreatedAt   time.Time
}

type VariantMaterial struct {
	Id         int64
	VariantId  int64
	MaterialId int64
	Material   Material
	Amount     float32
	DeletedAt  *time.Time
	CreatedAt  time.Time
}

type VariantValue struct {
	Id            int64
	VariantId     int64
	OptionValueId int64
	OptionValue   OptionValue
}

type Variant struct {
	Id                int64
	ProductId         int64
	Product           Product
	Name              string
	Price             float32
	Description       *string
	Recipe            *string
	ImageUrl          *string
	Materials         []VariantMaterial
	DeletedAt         *time.Time
	CreatedAt         time.Time
	VariantValues     []VariantValue
	PricingTiers      []PricingTier
	Tags              []VariantTag
	TagIds            []int64
	IsAvailable       bool
	AvailableQuantity *int
}

func (variant Variant) IsSellable() bool {
	return variant.Product.DeletedAt == nil &&
		variant.DeletedAt == nil &&
		variant.Product.Status == ProductStatusPublished &&
		variant.Product.SaleType == SaleTypePurchase &&
		variant.Product.IsAvailable &&
		variant.IsAvailable &&
		(variant.SellableQuantity() == nil || *variant.SellableQuantity() > 0)
}

func (variant Variant) SellableQuantity() *int {
	switch variant.Product.AvailabilityTracking {
	case AvailabilityTrackingProduct:
		return variant.Product.AvailableQuantity
	case AvailabilityTrackingVariant:
		return variant.AvailableQuantity
	default:
		return nil
	}
}
