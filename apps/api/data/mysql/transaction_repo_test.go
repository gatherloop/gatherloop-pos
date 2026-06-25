package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/migrations"
	"apps/api/pkg/migrator"
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

const (
	testDBUser = "root"
	testDBPass = ""
	testDBHost = "127.0.0.1"
	testDBPort = "3306"
	testDBName = "gatherloop_pos_test"
)

// setupTestDB skips the test when MySQL is not reachable, otherwise it
// applies all migrations (idempotent) and returns a connected *gorm.DB.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		testDBUser, testDBPass, testDBHost, testDBPort, testDBName)
	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Skipf("skipping: cannot open MySQL DSN: %v", err)
	}
	defer sqlDB.Close()
	if err := sqlDB.Ping(); err != nil {
		t.Skipf("skipping: MySQL not reachable at %s:%s — %v", testDBHost, testDBPort, err)
	}

	require.NoError(t, migrator.Run(migrator.Params{
		DbUsername:   testDBUser,
		DbPassword:   testDBPass,
		DbHost:       testDBHost,
		DbPort:       testDBPort,
		DbName:       testDBName,
		MigrationsFS: migrations.FS,
	}))

	db, err := mysql.ConnectDB(mysql.ConnectDBParams{
		DbUsername: testDBUser,
		DbPassword: testDBPass,
		DbHost:     testDBHost,
		DbPort:     testDBPort,
		DbName:     testDBName,
	})
	require.NoError(t, err)
	return db
}

// TestTransactionRepository_ItemLinkedCouponRoundTrip covers Phase 4 of the
// rental-coupons plan: a transaction_coupons row that links to a
// transaction_item must persist and reload with that link intact, alongside
// the discounted item's discount_amount/subtotal.
func TestTransactionRepository_ItemLinkedCouponRoundTrip(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	categoryRepo := mysql.NewCategoryRepository(db)
	productRepo := mysql.NewProductRepository(db)
	variantRepo := mysql.NewVariantRepository(db)
	couponRepo := mysql.NewCouponRepository(db)
	transactionRepo := mysql.NewTransactionRepository(db)

	category, err := categoryRepo.CreateCategory(ctx, domain.Category{Name: "Item Coupon Round Trip Category"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM categories WHERE id = ?", category.Id) })

	product, err := productRepo.CreateProduct(ctx, domain.Product{
		CategoryId: category.Id,
		Name:       "Item Coupon Round Trip Product",
		SaleType:   domain.SaleTypePurchase,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM products WHERE id = ?", product.Id) })

	variant, err := variantRepo.CreateVariant(ctx, domain.Variant{
		ProductId: product.Id,
		Name:      "Regular",
		Price:     30000,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM variants WHERE id = ?", variant.Id) })

	coupon, err := couponRepo.CreateCoupon(ctx, domain.Coupon{
		Code:   fmt.Sprintf("ITEM-COUPON-RT-%d", time.Now().UnixNano()),
		Type:   domain.Percentage,
		Amount: 40,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM coupons WHERE id = ?", coupon.Id) })

	// Checkout: a single 30,000 line item, no coupons yet.
	created, err := transactionRepo.CreateTransaction(ctx, domain.Transaction{
		Name:  "Item Coupon Round Trip Transaction",
		Total: 30000,
		TransactionItems: []domain.TransactionItem{
			{VariantId: variant.Id, Amount: 1, Price: 30000, Subtotal: 30000, ProductName: product.Name},
		},
	})
	require.Nil(t, err)
	require.Len(t, created.TransactionItems, 1)
	t.Cleanup(func() {
		db.Exec("DELETE FROM transaction_coupons WHERE transaction_id = ?", created.Id)
		db.Exec("DELETE FROM transaction_items WHERE transaction_id = ?", created.Id)
		db.Exec("DELETE FROM transactions WHERE id = ?", created.Id)
	})

	itemId := created.TransactionItems[0].Id

	// Edit: attach STUDENT-style 40% coupon to that line item, as done on the
	// transaction edit screen (PRD D2).
	_, err = transactionRepo.UpdateTransactionById(ctx, domain.Transaction{
		Name:  created.Name,
		Total: 17500,
		TransactionItems: []domain.TransactionItem{
			{
				Id:             itemId,
				VariantId:      variant.Id,
				Amount:         1,
				Price:          30000,
				DiscountAmount: 12500,
				Subtotal:       17500,
				ProductName:    product.Name,
			},
		},
		TransactionCoupons: []domain.TransactionCoupon{
			{
				CouponId:          coupon.Id,
				Type:              domain.Percentage,
				Amount:            40,
				TransactionItemId: &itemId,
			},
		},
	}, created.Id)
	require.Nil(t, err)

	// Reload from scratch to verify the link and discount survive a round trip.
	reloaded, err := transactionRepo.GetTransactionById(ctx, created.Id)
	require.Nil(t, err)

	require.Len(t, reloaded.TransactionItems, 1)
	assert.Equal(t, float32(12500), reloaded.TransactionItems[0].DiscountAmount)
	assert.Equal(t, float32(17500), reloaded.TransactionItems[0].Subtotal)

	require.Len(t, reloaded.TransactionCoupons, 1)
	require.NotNil(t, reloaded.TransactionCoupons[0].TransactionItemId)
	assert.Equal(t, itemId, *reloaded.TransactionCoupons[0].TransactionItemId)
	assert.Equal(t, coupon.Id, reloaded.TransactionCoupons[0].CouponId)
	assert.Equal(t, domain.Percentage, reloaded.TransactionCoupons[0].Type)
	assert.Equal(t, int64(40), reloaded.TransactionCoupons[0].Amount)
}

// TestTransactionRepository_WholeBillCouponRoundTrip ensures the existing,
// unchanged whole-bill coupon shape (transaction_item_id = NULL) keeps
// round-tripping as nil after the new column is added.
func TestTransactionRepository_WholeBillCouponRoundTrip(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	couponRepo := mysql.NewCouponRepository(db)
	transactionRepo := mysql.NewTransactionRepository(db)

	coupon, err := couponRepo.CreateCoupon(ctx, domain.Coupon{
		Code:   fmt.Sprintf("WHOLE-BILL-RT-%d", time.Now().UnixNano()),
		Type:   domain.Fixed,
		Amount: 5000,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM coupons WHERE id = ?", coupon.Id) })

	created, err := transactionRepo.CreateTransaction(ctx, domain.Transaction{
		Name:  "Whole Bill Coupon Round Trip Transaction",
		Total: 25000,
		TransactionCoupons: []domain.TransactionCoupon{
			{CouponId: coupon.Id, Type: domain.Fixed, Amount: 5000},
		},
	})
	require.Nil(t, err)
	t.Cleanup(func() {
		db.Exec("DELETE FROM transaction_coupons WHERE transaction_id = ?", created.Id)
		db.Exec("DELETE FROM transactions WHERE id = ?", created.Id)
	})

	reloaded, err := transactionRepo.GetTransactionById(ctx, created.Id)
	require.Nil(t, err)

	require.Len(t, reloaded.TransactionCoupons, 1)
	assert.Nil(t, reloaded.TransactionCoupons[0].TransactionItemId)
}

// createTransactionAt creates a transaction via the repository and then
// backdates its created_at with a raw UPDATE, since CreateTransaction always
// stamps "now" and the statistics tests need deterministic, spread-out dates.
func createTransactionAt(t *testing.T, db *gorm.DB, transactionRepo domain.TransactionRepository, name string, total float32, createdAt time.Time) int64 {
	t.Helper()

	created, err := transactionRepo.CreateTransaction(context.Background(), domain.Transaction{Name: name, Total: total})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM transactions WHERE id = ?", created.Id) })

	require.NoError(t, db.Exec("UPDATE transactions SET created_at = ? WHERE id = ?", createdAt, created.Id).Error)

	return created.Id
}

// TestTransactionRepository_GetTransactionStatistics_RangeAndOrdering covers
// Phase 1 of the dashboard date-range filter (PRD FR-1/FR-2): bounded results,
// inclusive endDate, and chronological (not string) ordering across the
// year boundary that exposes the "01-2025" < "12-2024" string-sort bug.
func TestTransactionRepository_GetTransactionStatistics_RangeAndOrdering(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	transactionRepo := mysql.NewTransactionRepository(db)

	dec := createTransactionAt(t, db, transactionRepo, "Stats Dec 2024", 100, time.Date(2024, 12, 15, 10, 0, 0, 0, time.Local))
	jan10 := createTransactionAt(t, db, transactionRepo, "Stats Jan 10 2025", 200, time.Date(2025, 1, 10, 10, 0, 0, 0, time.Local))
	jan20 := createTransactionAt(t, db, transactionRepo, "Stats Jan 20 2025", 300, time.Date(2025, 1, 20, 23, 59, 0, 0, time.Local))
	feb := createTransactionAt(t, db, transactionRepo, "Stats Feb 2025", 400, time.Date(2025, 2, 5, 10, 0, 0, 0, time.Local))
	_ = dec
	_ = jan10
	_ = jan20
	_ = feb

	t.Run("month grouping orders chronologically across year boundary", func(t *testing.T) {
		stats, err := transactionRepo.GetTransactionStatistics(ctx, "month", nil, nil)
		require.Nil(t, err)
		require.True(t, len(stats) >= 2)

		decIndex, janIndex := -1, -1
		for i, s := range stats {
			if s.Date == "12-2024" {
				decIndex = i
			}
			if s.Date == "01-2025" {
				janIndex = i
			}
		}
		require.NotEqual(t, -1, decIndex, "expected 12-2024 in results")
		require.NotEqual(t, -1, janIndex, "expected 01-2025 in results")
		assert.Less(t, decIndex, janIndex, "12-2024 must come before 01-2025 in real chronological order")
	})

	t.Run("bounded range excludes rows outside the window", func(t *testing.T) {
		startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local)
		endDate := time.Date(2025, 1, 31, 0, 0, 0, 0, time.Local)

		stats, err := transactionRepo.GetTransactionStatistics(ctx, "date", &startDate, &endDate)
		require.Nil(t, err)

		var total float32
		for _, s := range stats {
			total += s.Total
		}
		assert.Equal(t, float32(500), total, "expected only the two January transactions (200 + 300)")
	})

	t.Run("inclusive endDate includes the whole day", func(t *testing.T) {
		startDate := time.Date(2025, 1, 20, 0, 0, 0, 0, time.Local)
		endDate := time.Date(2025, 1, 20, 0, 0, 0, 0, time.Local)

		stats, err := transactionRepo.GetTransactionStatistics(ctx, "date", &startDate, &endDate)
		require.Nil(t, err)

		var total float32
		for _, s := range stats {
			total += s.Total
		}
		assert.Equal(t, float32(300), total, "endDate=2025-01-20 must include the 23:59 transaction on that day")
	})
}
