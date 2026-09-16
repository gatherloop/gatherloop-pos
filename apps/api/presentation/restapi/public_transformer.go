package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
)

func ToPublicApiProduct(product domain.Product) apiContract.Product {
	apiProduct := ToApiProduct(product)
	apiProduct.Recipe = nil
	return apiProduct
}

func ToPublicApiVariant(variant domain.Variant) apiContract.Variant {
	apiVariant := ToApiVariant(variant)
	apiVariant.Materials = []apiContract.VariantMaterial{}
	apiVariant.PricingTiers = []apiContract.PricingTier{}
	apiVariant.Recipe = nil
	apiVariant.Product.Recipe = nil
	return apiVariant
}

func IsPublicProduct(product domain.Product) bool {
	return product.DeletedAt == nil &&
		product.Status == domain.ProductStatusPublished &&
		product.SaleType == domain.SaleTypePurchase
}
