package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestProductTransformerRoundTrip_Availability(t *testing.T) {
	quantity := 5
	product := domain.Product{
		Id:                   1,
		CategoryId:           2,
		Name:                 "Pancong",
		ImageUrl:             "http://example.com/pancong.png",
		SaleType:             domain.SaleTypePurchase,
		Status:               domain.ProductStatusPublished,
		IsAvailable:          false,
		AvailabilityTracking: domain.AvailabilityTrackingProduct,
		AvailableQuantity:    &quantity,
	}

	dbProduct := mysql.ToProductDB(product)
	assert.Equal(t, false, dbProduct.IsAvailable)
	assert.Equal(t, "product", dbProduct.AvailabilityTracking)
	assert.Equal(t, &quantity, dbProduct.AvailableQuantity)

	roundTripped := mysql.ToProductDomain(dbProduct)
	assert.Equal(t, product.IsAvailable, roundTripped.IsAvailable)
	assert.Equal(t, product.AvailabilityTracking, roundTripped.AvailabilityTracking)
	assert.Equal(t, product.AvailableQuantity, roundTripped.AvailableQuantity)
}

func TestProductTransformerRoundTrip_AvailabilityDefaults(t *testing.T) {
	product := domain.Product{
		Id:         1,
		CategoryId: 2,
		Name:       "Es Kopi Susu",
		ImageUrl:   "http://example.com/kopi.png",
		SaleType:   domain.SaleTypePurchase,
		Status:     domain.ProductStatusPublished,
	}

	dbProduct := mysql.ToProductDB(product)
	roundTripped := mysql.ToProductDomain(dbProduct)

	assert.Equal(t, false, roundTripped.IsAvailable)
	assert.Equal(t, domain.AvailabilityTracking(""), roundTripped.AvailabilityTracking)
	assert.Nil(t, roundTripped.AvailableQuantity)
}

func TestProductTransformer_NestedVariantsCarryTheirProduct(t *testing.T) {
	dbProduct := mysql.Product{
		Id:                   1,
		Status:               string(domain.ProductStatusPublished),
		SaleType:             string(domain.SaleTypePurchase),
		IsAvailable:          true,
		AvailabilityTracking: string(domain.AvailabilityTrackingNone),
		Variants:             []mysql.Variant{{Id: 1, ProductId: 1, IsAvailable: true}},
	}

	product := mysql.ToProductDomain(dbProduct)

	assert.Equal(t, int64(1), product.Variants[0].Product.Id)
	assert.True(t, product.Variants[0].IsSellable())
	assert.True(t, product.IsSellable())
}
