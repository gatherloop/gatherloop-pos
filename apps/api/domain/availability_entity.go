package domain

type AvailabilityVariant struct {
	VariantId         int64
	VariantName       string
	IsAvailable       bool
	AvailableQuantity *int
	IsSellable        bool
	SellableQuantity  *int
}

type AvailabilityProduct struct {
	ProductId            int64
	ProductName          string
	CategoryId           int64
	CategoryName         string
	AvailabilityTracking AvailabilityTracking
	IsAvailable          bool
	AvailableQuantity    *int
	IsSellable           bool
	SellableQuantity     *int
	Variants             []AvailabilityVariant
}

type AvailabilityProductUpdate struct {
	ProductId         int64
	IsAvailable       *bool
	AvailableQuantity *int
}

type AvailabilityVariantUpdate struct {
	VariantId         int64
	IsAvailable       *bool
	AvailableQuantity *int
}

func ToAvailabilityProduct(product Product, variants []Variant) AvailabilityProduct {
	isSellable, sellableQuantity := ResolveProductAvailability(product, variants)

	availabilityVariants := make([]AvailabilityVariant, 0, len(variants))
	for _, variant := range variants {
		availabilityVariants = append(availabilityVariants, toAvailabilityVariant(product, variant))
	}

	return AvailabilityProduct{
		ProductId:            product.Id,
		ProductName:          product.Name,
		CategoryId:           product.CategoryId,
		CategoryName:         product.Category.Name,
		AvailabilityTracking: product.AvailabilityTracking,
		IsAvailable:          product.IsAvailable,
		AvailableQuantity:    product.AvailableQuantity,
		IsSellable:           isSellable,
		SellableQuantity:     sellableQuantity,
		Variants:             availabilityVariants,
	}
}

func toAvailabilityVariant(product Product, variant Variant) AvailabilityVariant {
	isSellable, sellableQuantity := ResolveVariantAvailability(product, variant)

	return AvailabilityVariant{
		VariantId:         variant.Id,
		VariantName:       variant.Name,
		IsAvailable:       variant.IsAvailable,
		AvailableQuantity: variant.AvailableQuantity,
		IsSellable:        isSellable,
		SellableQuantity:  sellableQuantity,
	}
}
