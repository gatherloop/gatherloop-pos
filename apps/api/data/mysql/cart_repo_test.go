package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCartRepository_CreateAndFetchActiveCart(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	categoryRepo := mysql.NewCategoryRepository(db)
	productRepo := mysql.NewProductRepository(db)
	variantRepo := mysql.NewVariantRepository(db)
	tableRepo := mysql.NewTableRepository(db)
	cartRepo := mysql.NewCartRepository(db)

	category, err := categoryRepo.CreateCategory(ctx, domain.Category{Name: "Cart Repo Category"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM categories WHERE id = ?", category.Id) })

	product, err := productRepo.CreateProduct(ctx, domain.Product{
		CategoryId: category.Id,
		Name:       "Cart Repo Product",
		SaleType:   domain.SaleTypePurchase,
		Status:     domain.ProductStatusPublished,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM products WHERE id = ?", product.Id) })

	variant, err := variantRepo.CreateVariant(ctx, domain.Variant{
		ProductId: product.Id,
		Name:      "Regular",
		Price:     20000,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM variants WHERE id = ?", variant.Id) })

	code, codeErr := domain.GenerateTableCode()
	require.Nil(t, codeErr)
	table, tableErr := tableRepo.CreateTable(ctx, domain.Table{Code: code, Label: fmt.Sprintf("Cart Repo Table %d", variant.Id)})
	require.Nil(t, tableErr)
	t.Cleanup(func() { db.Exec("DELETE FROM tables WHERE id = ?", table.Id) })

	sessionId := fmt.Sprintf("11111111-1111-1111-1111-%012d", variant.Id)

	// No active cart yet — GetActiveCartBySessionId must surface NotFound so a
	// usecase can lazily create one, per FR-3.
	_, notFoundErr := cartRepo.GetActiveCartBySessionId(ctx, sessionId)
	require.NotNil(t, notFoundErr)
	assert.Equal(t, domain.NotFound, notFoundErr.Type)

	created, err := cartRepo.CreateCart(ctx, domain.Cart{
		SessionId: sessionId,
		TableId:   &table.Id,
		Status:    domain.CartStatusActive,
	})
	require.Nil(t, err)
	t.Cleanup(func() {
		db.Exec("DELETE FROM cart_items WHERE cart_id = ?", created.Id)
		db.Exec("DELETE FROM carts WHERE id = ?", created.Id)
	})

	assert.Equal(t, sessionId, created.SessionId)
	assert.Equal(t, domain.CartStatusActive, created.Status)
	require.NotNil(t, created.TableId)
	assert.Equal(t, table.Id, *created.TableId)
	require.NotNil(t, created.Table)
	assert.Equal(t, table.Label, created.Table.Label)
	assert.Empty(t, created.Items)

	fetched, err := cartRepo.GetActiveCartBySessionId(ctx, sessionId)
	require.Nil(t, err)
	assert.Equal(t, created.Id, fetched.Id)
}

func TestCartRepository_ItemLifecycle(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	categoryRepo := mysql.NewCategoryRepository(db)
	productRepo := mysql.NewProductRepository(db)
	variantRepo := mysql.NewVariantRepository(db)
	cartRepo := mysql.NewCartRepository(db)

	category, err := categoryRepo.CreateCategory(ctx, domain.Category{Name: "Cart Item Repo Category"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM categories WHERE id = ?", category.Id) })

	product, err := productRepo.CreateProduct(ctx, domain.Product{
		CategoryId: category.Id,
		Name:       "Cart Item Repo Product",
		SaleType:   domain.SaleTypePurchase,
		Status:     domain.ProductStatusPublished,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM products WHERE id = ?", product.Id) })

	variant, err := variantRepo.CreateVariant(ctx, domain.Variant{
		ProductId: product.Id,
		Name:      "Regular",
		Price:     15000,
	})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM variants WHERE id = ?", variant.Id) })

	sessionId := fmt.Sprintf("22222222-2222-2222-2222-%012d", variant.Id)
	cart, err := cartRepo.CreateCart(ctx, domain.Cart{SessionId: sessionId, Status: domain.CartStatusActive})
	require.Nil(t, err)
	t.Cleanup(func() {
		db.Exec("DELETE FROM cart_items WHERE cart_id = ?", cart.Id)
		db.Exec("DELETE FROM carts WHERE id = ?", cart.Id)
	})

	item, err := cartRepo.CreateCartItem(ctx, domain.CartItem{
		CartId:    cart.Id,
		VariantId: variant.Id,
		Amount:    2,
		Note:      "less sugar",
	})
	require.Nil(t, err)
	assert.Equal(t, float32(2), item.Amount)
	assert.Equal(t, "less sugar", item.Note)
	assert.Equal(t, variant.Id, item.Variant.Id)
	assert.Equal(t, variant.Name, item.Variant.Name)

	reloadedCart, err := cartRepo.GetCartById(ctx, cart.Id)
	require.Nil(t, err)
	require.Len(t, reloadedCart.Items, 1)
	assert.Equal(t, item.Id, reloadedCart.Items[0].Id)

	updated, err := cartRepo.UpdateCartItemById(ctx, domain.CartItem{Amount: 3, Note: "no sugar"}, item.Id)
	require.Nil(t, err)
	assert.Equal(t, float32(3), updated.Amount)
	assert.Equal(t, "no sugar", updated.Note)

	deleteErr := cartRepo.DeleteCartItemById(ctx, item.Id)
	require.Nil(t, deleteErr)

	afterDelete, err := cartRepo.GetCartById(ctx, cart.Id)
	require.Nil(t, err)
	assert.Empty(t, afterDelete.Items)

	// Re-add two items, then verify DeleteCartItemsByCartId clears the cart
	// in one call, the shape CartUsecase needs for DELETE /carts/current.
	_, err = cartRepo.CreateCartItem(ctx, domain.CartItem{CartId: cart.Id, VariantId: variant.Id, Amount: 1})
	require.Nil(t, err)
	_, err = cartRepo.CreateCartItem(ctx, domain.CartItem{CartId: cart.Id, VariantId: variant.Id, Amount: 1, Note: "extra ice"})
	require.Nil(t, err)

	clearErr := cartRepo.DeleteCartItemsByCartId(ctx, cart.Id)
	require.Nil(t, clearErr)

	clearedCart, err := cartRepo.GetCartById(ctx, cart.Id)
	require.Nil(t, err)
	assert.Empty(t, clearedCart.Items)
}

func TestCartRepository_UpdateCartTableId(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	tableRepo := mysql.NewTableRepository(db)
	cartRepo := mysql.NewCartRepository(db)

	code, codeErr := domain.GenerateTableCode()
	require.Nil(t, codeErr)
	table, tableErr := tableRepo.CreateTable(ctx, domain.Table{Code: code, Label: fmt.Sprintf("Cart Update Table %s", code)})
	require.Nil(t, tableErr)
	t.Cleanup(func() { db.Exec("DELETE FROM tables WHERE id = ?", table.Id) })

	sessionId := fmt.Sprintf("33333333-3333-3333-3333-%012d", table.Id)
	cart, err := cartRepo.CreateCart(ctx, domain.Cart{SessionId: sessionId, Status: domain.CartStatusActive})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM carts WHERE id = ?", cart.Id) })
	assert.Nil(t, cart.TableId)

	updated, err := cartRepo.UpdateCartById(ctx, domain.Cart{TableId: &table.Id, Status: domain.CartStatusActive}, cart.Id)
	require.Nil(t, err)
	require.NotNil(t, updated.TableId)
	assert.Equal(t, table.Id, *updated.TableId)
	require.NotNil(t, updated.Table)
	assert.Equal(t, table.Label, updated.Table.Label)
}
