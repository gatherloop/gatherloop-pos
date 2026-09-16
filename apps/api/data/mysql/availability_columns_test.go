package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newDryRunDb(t *testing.T) *gorm.DB {
	t.Helper()

	sqlDB, _, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{SkipDefaultTransaction: true})
	require.NoError(t, err)

	return gormDB.Session(&gorm.Session{DryRun: true})
}

// A product/variant created without touching the new availability fields must still get
// is_available = true and availability_tracking = none in the row, matching the migration's
// column defaults (FR-1) — not left as the Go zero values (false, ”), which would silently
// mark every newly created item unavailable.
func TestCreateProduct_AvailabilityColumnsUseDefaultsNotZeroValues(t *testing.T) {
	db := newDryRunDb(t)

	payload := mysql.ToProductDB(domain.Product{
		CategoryId: 1,
		Name:       "Nasi Goreng",
		ImageUrl:   "http://example.com/x.png",
		SaleType:   domain.SaleTypePurchase,
		Status:     domain.ProductStatusPublished,
	})

	stmt := db.Table("products").Create(&payload).Statement

	assert.Contains(t, stmt.SQL.String(), "`is_available`")
	assert.Contains(t, stmt.SQL.String(), "`availability_tracking`")
	assert.Contains(t, stmt.Vars, true)
	assert.Contains(t, stmt.Vars, "none")
}

// An update that never touches the availability columns must leave them out of the SET
// clause entirely, so an existing product's switches/counters survive an unrelated
// PUT /products/{id} untouched (phase 1 acceptance: round-trips unchanged).
func TestUpdateProductById_AvailabilityColumnsOmittedWhenUntouched(t *testing.T) {
	db := newDryRunDb(t)

	payload := mysql.ToProductDB(domain.Product{
		CategoryId: 1,
		Name:       "Nasi Goreng Updated",
		ImageUrl:   "http://example.com/x.png",
		SaleType:   domain.SaleTypePurchase,
		Status:     domain.ProductStatusPublished,
	})

	stmt := db.Table("products").Where("id = ?", 1).Updates(&payload).Statement

	assert.NotContains(t, stmt.SQL.String(), "is_available")
	assert.NotContains(t, stmt.SQL.String(), "availability_tracking")
	assert.NotContains(t, stmt.SQL.String(), "available_quantity")
}

func TestCreateVariant_AvailabilityColumnUsesDefaultNotZeroValue(t *testing.T) {
	db := newDryRunDb(t)

	payload := mysql.ToVariantDB(domain.Variant{
		ProductId: 1,
		Name:      "Choco",
		Price:     15000,
	})
	payload.PricingTiers = nil

	stmt := db.Table("variants").Create(&payload).Statement

	assert.Contains(t, stmt.SQL.String(), "`is_available`")
	assert.Contains(t, stmt.Vars, true)
}

func TestUpdateVariantById_AvailabilityColumnsOmittedWhenUntouched(t *testing.T) {
	db := newDryRunDb(t)

	payload := mysql.ToVariantDB(domain.Variant{
		ProductId: 1,
		Name:      "Choco Updated",
		Price:     16000,
	})
	payload.PricingTiers = nil

	stmt := db.Table("variants").Where("id = ?", 1).Updates(&payload).Statement

	assert.NotContains(t, stmt.SQL.String(), "is_available")
	assert.NotContains(t, stmt.SQL.String(), "available_quantity")
}
