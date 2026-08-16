package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCartRepository(db *gorm.DB) domain.CartRepository {
	return Repository{db: db}
}

func preloadCart(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Table").
		Preload("Items", "deleted_at IS NULL").
		Preload("Items.Variant").
		Preload("Items.Variant.Product").
		Preload("Items.Variant.Product.Category").
		Preload("Items.Variant.VariantValues").
		Preload("Items.Variant.VariantValues.OptionValue")
}

func (repo Repository) GetActiveCartBySessionId(ctx context.Context, sessionId string) (domain.Cart, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var cart Cart
	result := preloadCart(db.Table("carts")).
		Where("session_id = ? AND status = ? AND deleted_at IS NULL", sessionId, string(domain.CartStatusActive)).
		First(&cart)
	return ToCartDomain(cart), ToErrorCtx(ctx, result.Error, "GetActiveCartBySessionId")
}

func (repo Repository) GetCartById(ctx context.Context, id int64) (domain.Cart, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var cart Cart
	result := preloadCart(db.Table("carts")).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&cart)
	return ToCartDomain(cart), ToErrorCtx(ctx, result.Error, "GetCartById")
}

func (repo Repository) CreateCart(ctx context.Context, cart domain.Cart) (domain.Cart, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCartDB(cart)

	if result := db.Table("carts").Omit("Items", "Table").Create(&payload); result.Error != nil {
		return domain.Cart{}, ToErrorCtx(ctx, result.Error, "CreateCart")
	}

	return repo.GetCartById(ctx, payload.Id)
}

func (repo Repository) UpdateCartById(ctx context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCartDB(cart)

	if result := db.Table("carts").Where("id = ?", id).Updates(map[string]any{
		"table_id": payload.TableId,
		"status":   payload.Status,
	}); result.Error != nil {
		return domain.Cart{}, ToErrorCtx(ctx, result.Error, "UpdateCartById")
	}

	return repo.GetCartById(ctx, id)
}

func (repo Repository) GetCartItemById(ctx context.Context, id int64) (domain.CartItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var item CartItem
	result := db.Table("cart_items").
		Preload("Variant").
		Preload("Variant.Product").
		Preload("Variant.Product.Category").
		Preload("Variant.VariantValues").
		Preload("Variant.VariantValues.OptionValue").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&item)
	return ToCartItemDomain(item), ToErrorCtx(ctx, result.Error, "GetCartItemById")
}

func (repo Repository) CreateCartItem(ctx context.Context, cartItem domain.CartItem) (domain.CartItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCartItemDB(cartItem)

	if result := db.Table("cart_items").Omit("Variant").Create(&payload); result.Error != nil {
		return domain.CartItem{}, ToErrorCtx(ctx, result.Error, "CreateCartItem")
	}

	return repo.GetCartItemById(ctx, payload.Id)
}

func (repo Repository) UpdateCartItemById(ctx context.Context, cartItem domain.CartItem, id int64) (domain.CartItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	if result := db.Table("cart_items").Where("id = ?", id).Updates(map[string]any{
		"amount": cartItem.Amount,
		"note":   cartItem.Note,
	}); result.Error != nil {
		return domain.CartItem{}, ToErrorCtx(ctx, result.Error, "UpdateCartItemById")
	}

	return repo.GetCartItemById(ctx, id)
}

func (repo Repository) DeleteCartItemById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("cart_items").Where("id = ?", id).Update("deleted_at", time.Now())
	return ToErrorCtx(ctx, result.Error, "DeleteCartItemById")
}

func (repo Repository) DeleteCartItemsByCartId(ctx context.Context, cartId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("cart_items").Where("cart_id = ? AND deleted_at IS NULL", cartId).Update("deleted_at", time.Now())
	return ToErrorCtx(ctx, result.Error, "DeleteCartItemsByCartId")
}
