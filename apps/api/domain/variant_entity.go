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
	Materials         []VariantMaterial
	DeletedAt         *time.Time
	CreatedAt         time.Time
	VariantValues     []VariantValue
	PricingTiers      []PricingTier
	IsAvailable       bool
	AvailableQuantity *int
	IsSellable        bool
	RemainingQuantity *int
}

func ResolveVariantAvailability(product Product, variant Variant) (isSellable bool, remaining *int) {
	remaining = variantRemainingQuantity(product, variant)

	isSellable = product.DeletedAt == nil &&
		variant.DeletedAt == nil &&
		product.Status == ProductStatusPublished &&
		product.SaleType == SaleTypePurchase &&
		product.IsAvailable &&
		variant.IsAvailable &&
		(remaining == nil || *remaining > 0)

	return isSellable, remaining
}

func variantRemainingQuantity(product Product, variant Variant) *int {
	switch product.AvailabilityTracking {
	case AvailabilityTrackingProduct:
		return product.AvailableQuantity
	case AvailabilityTrackingVariant:
		return variant.AvailableQuantity
	default:
		return nil
	}
}
