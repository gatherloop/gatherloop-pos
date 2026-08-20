package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
)

// ToPublicApiProduct maps a product the same way ToApiProduct does, but clears
// Recipe so internal preparation notes never reach a customer (FR-4).
func ToPublicApiProduct(product domain.Product) apiContract.Product {
	apiProduct := ToApiProduct(product)
	apiProduct.Recipe = nil
	return apiProduct
}

// ToPublicApiVariant maps a variant the same way ToApiVariant does, but strips
// materials and pricing tiers so COGS and rental pricing never reach a customer (D2),
// and clears Recipe on both the variant and its nested product (FR-4).
func ToPublicApiVariant(variant domain.Variant) apiContract.Variant {
	apiVariant := ToApiVariant(variant)
	apiVariant.Materials = []apiContract.VariantMaterial{}
	apiVariant.PricingTiers = []apiContract.PricingTier{}
	apiVariant.Recipe = nil
	apiVariant.Product.Recipe = nil
	return apiVariant
}

// IsPublicProduct reports whether a product may be shown to an anonymous customer:
// published, purchasable, and not soft-deleted.
func IsPublicProduct(product domain.Product) bool {
	return product.DeletedAt == nil &&
		product.Status == domain.ProductStatusPublished &&
		product.SaleType == domain.SaleTypePurchase
}
