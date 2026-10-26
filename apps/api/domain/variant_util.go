package domain

func resolveVariantAvailability(variant Variant, product Product) Variant {
	isSellable, sellableQuantity := ResolveVariantAvailability(product, variant)
	variant.IsSellable = isSellable
	variant.SellableQuantity = sellableQuantity

	variant.Product = product
	productIsSellable, productSellableQuantity := ResolveProductAvailability(product, []Variant{variant})
	variant.Product.IsSellable = productIsSellable
	variant.Product.SellableQuantity = productSellableQuantity

	return variant
}

func ResolveVariantAvailability(product Product, variant Variant) (isSellable bool, sellableQuantity *int) {
	sellableQuantity = getVariantSellableQuantity(product, variant)

	isSellable = product.DeletedAt == nil &&
		variant.DeletedAt == nil &&
		product.Status == ProductStatusPublished &&
		product.SaleType == SaleTypePurchase &&
		product.IsAvailable &&
		variant.IsAvailable &&
		(sellableQuantity == nil || *sellableQuantity > 0)

	return isSellable, sellableQuantity
}

func getVariantSellableQuantity(product Product, variant Variant) *int {
	switch product.AvailabilityTracking {
	case AvailabilityTrackingProduct:
		return product.AvailableQuantity
	case AvailabilityTrackingVariant:
		return variant.AvailableQuantity
	default:
		return nil
	}
}
