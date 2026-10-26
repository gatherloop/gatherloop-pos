package domain

func resolveProductDerivedFields(product Product, variants []Variant) (Product, *Error) {
	isSellable, sellableQuantity := ResolveProductAvailability(product, variants)
	product.IsSellable = isSellable
	product.SellableQuantity = sellableQuantity
	product.Tags = ResolveProductTags(variants)
	return product, nil
}

func ResolveProductAvailability(product Product, variants []Variant) (isSellable bool, sellableQuantity *int) {
	sellableQuantity = getProductSellableQuantity(product)

	for _, variant := range variants {
		variantIsSellable, _ := ResolveVariantAvailability(product, variant)
		if variantIsSellable {
			isSellable = true
			break
		}
	}

	return isSellable, sellableQuantity
}

func getProductSellableQuantity(product Product) *int {
	if product.AvailabilityTracking == AvailabilityTrackingProduct {
		return product.AvailableQuantity
	}
	return nil
}
