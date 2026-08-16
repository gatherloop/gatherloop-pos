//go:generate mockgen -source=cart_repository.go -destination=../data/mock/cart_repository.go -package=mock

package domain

import "context"

type CartRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetActiveCartBySessionId(ctx context.Context, sessionId string) (Cart, *Error)
	GetCartById(ctx context.Context, id int64) (Cart, *Error)
	CreateCart(ctx context.Context, cart Cart) (Cart, *Error)
	UpdateCartById(ctx context.Context, cart Cart, id int64) (Cart, *Error)
	GetCartItemById(ctx context.Context, id int64) (CartItem, *Error)
	CreateCartItem(ctx context.Context, cartItem CartItem) (CartItem, *Error)
	UpdateCartItemById(ctx context.Context, cartItem CartItem, id int64) (CartItem, *Error)
	DeleteCartItemById(ctx context.Context, id int64) *Error
	DeleteCartItemsByCartId(ctx context.Context, cartId int64) *Error
}
