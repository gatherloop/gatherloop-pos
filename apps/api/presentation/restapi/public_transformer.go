package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
)

// ToPublicApiVariant maps a variant the same way ToApiVariant does, but strips
// materials and pricing tiers so COGS and rental pricing never reach a customer (D2).
func ToPublicApiVariant(variant domain.Variant) apiContract.Variant {
	apiVariant := ToApiVariant(variant)
	apiVariant.Materials = []apiContract.VariantMaterial{}
	apiVariant.PricingTiers = []apiContract.PricingTier{}
	return apiVariant
}

// IsPublicProduct reports whether a product may be shown to an anonymous customer:
// published, purchasable, and not soft-deleted.
func IsPublicProduct(product domain.Product) bool {
	return product.DeletedAt == nil &&
		product.Status == domain.ProductStatusPublished &&
		product.SaleType == domain.SaleTypePurchase
}
