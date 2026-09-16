package domain

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

func productRemainingQuantity(product Product) *int {
	if product.AvailabilityTracking == AvailabilityTrackingProduct {
		return product.AvailableQuantity
	}
	return nil
}
