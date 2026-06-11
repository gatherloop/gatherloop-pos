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
