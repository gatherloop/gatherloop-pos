package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestVariantTransformerRoundTrip_Availability(t *testing.T) {
	quantity := 3
	variant := domain.Variant{
		Id:                1,
		ProductId:         2,
		Name:              "Choco",
		Price:             15000,
		IsAvailable:       false,
		AvailableQuantity: &quantity,
	}

	dbVariant := mysql.ToVariantDB(variant)
	assert.Equal(t, false, dbVariant.IsAvailable)
	assert.Equal(t, &quantity, dbVariant.AvailableQuantity)

	roundTripped := mysql.ToVariantDomain(dbVariant)
	assert.Equal(t, variant.IsAvailable, roundTripped.IsAvailable)
	assert.Equal(t, variant.AvailableQuantity, roundTripped.AvailableQuantity)
}

func TestVariantTransformerRoundTrip_AvailabilityDefaults(t *testing.T) {
	variant := domain.Variant{
		Id:        1,
		ProductId: 2,
		Name:      "Vanilla",
		Price:     15000,
	}

	dbVariant := mysql.ToVariantDB(variant)
	roundTripped := mysql.ToVariantDomain(dbVariant)

	assert.Equal(t, false, roundTripped.IsAvailable)
	assert.Nil(t, roundTripped.AvailableQuantity)
}
