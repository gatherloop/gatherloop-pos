package domain

import (
	"context"
	"regexp"
	"strings"
)

type CartUsecase struct {
	cartRepoPort  CartRepoPort
	tableRepoPort TableRepoPort
	cartService   CartService
}

func NewCartUsecase(
	cartRepoPort CartRepoPort,
	tableRepoPort TableRepoPort,
	cartService CartService,
) CartUsecase {
	return CartUsecase{
		cartRepoPort:  cartRepoPort,
		tableRepoPort: tableRepoPort,
		cartService:   cartService,
	}
}

func (usecase CartUsecase) GetCurrentCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := usecase.cartRepoPort.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Cart{SessionId: sessionId, Status: CartStatusActive, Items: []CartItem{}}, nil
		}
		return Cart{}, err
	}
	return usecase.cartService.AttachPendingPayment(ctx, cart)
}

func (usecase CartUsecase) UpdateCartTable(ctx context.Context, sessionId string, tableCode string) (Cart, *Error) {
	var tableCodePattern = regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{10}$`)
	if !tableCodePattern.MatchString(tableCode) {
		return Cart{}, &Error{Type: BadRequest, Message: "tableCode is invalid"}
	}

	var result Cart
	err := usecase.cartRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		table, tableErr := usecase.tableRepoPort.GetTableByCode(ctxWithTx, tableCode)
		if tableErr != nil {
			return tableErr
		}

		cart, cartErr := usecase.cartService.GetOrCreateActiveCart(ctxWithTx, sessionId)
		if cartErr != nil {
			return cartErr
		}
		if lockErr := usecase.cartService.EnsureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		cart.TableId = &table.Id
		updated, updateErr := usecase.cartRepoPort.UpdateCartById(ctxWithTx, cart, cart.Id)
		if updateErr != nil {
			return updateErr
		}
		result = updated
		return nil
	})

	return result, err
}

func (usecase CartUsecase) AddCartItem(ctx context.Context, sessionId string, variantId int64, amount float32, note string) (Cart, *Error) {
	note = strings.TrimSpace(note)
	item := CartItem{Note: note, Amount: amount, VariantId: variantId}
	if err := item.Validate(); err != nil {
		return Cart{}, err
	}

	var result Cart
	err := usecase.cartRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		variant, err := usecase.cartService.ValidatePurchasableVariant(ctxWithTx, variantId)
		if err != nil {
			return err
		}

		cart, cartErr := usecase.cartService.GetOrCreateActiveCart(ctxWithTx, sessionId)
		if cartErr != nil {
			return cartErr
		}
		if lockErr := usecase.cartService.EnsureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if capacityErr := cart.CheckCapacity(variant.Product, variant, 0, amount); capacityErr != nil {
			return capacityErr
		}

		if existing, found := cart.FindMatchingCartItem(variantId, note); found {
			existing.Amount += amount
			if _, updateErr := usecase.cartRepoPort.UpdateCartItemById(ctxWithTx, existing, existing.Id); updateErr != nil {
				return updateErr
			}
		} else {
			item.CartId = cart.Id
			if _, createErr := usecase.cartRepoPort.CreateCartItem(ctxWithTx, item); createErr != nil {
				return createErr
			}
		}

		refreshed, refreshErr := usecase.cartRepoPort.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = refreshed
		return nil
	})

	return result, err
}

func (usecase CartUsecase) UpdateCartItem(ctx context.Context, sessionId string, cartItemId int64, amount float32, note string) (Cart, *Error) {
	note = strings.TrimSpace(note)
	item := CartItem{Note: note, Amount: amount}
	if err := item.Validate(); err != nil {
		return Cart{}, err
	}

	var result Cart
	err := usecase.cartRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		cart, existing, ownedErr := usecase.cartService.GetOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}
		if lockErr := usecase.cartService.EnsureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if capacityErr := cart.CheckCapacity(existing.Variant.Product, existing.Variant, cartItemId, amount); capacityErr != nil {
			return capacityErr
		}

		if _, updateErr := usecase.cartRepoPort.UpdateCartItemById(ctxWithTx, item, cartItemId); updateErr != nil {
			return updateErr
		}

		refreshed, refreshErr := usecase.cartRepoPort.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = refreshed
		return nil
	})

	return result, err
}

func (usecase CartUsecase) RemoveCartItem(ctx context.Context, sessionId string, cartItemId int64) (Cart, *Error) {
	var result Cart
	err := usecase.cartRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		cart, _, ownedErr := usecase.cartService.GetOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}
		if lockErr := usecase.cartService.EnsureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if deleteErr := usecase.cartRepoPort.DeleteCartItemById(ctxWithTx, cartItemId); deleteErr != nil {
			return deleteErr
		}

		refreshed, refreshErr := usecase.cartRepoPort.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = refreshed
		return nil
	})

	return result, err
}

func (usecase CartUsecase) ClearCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := usecase.cartRepoPort.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Cart{SessionId: sessionId, Status: CartStatusActive, Items: []CartItem{}}, nil
		}
		return Cart{}, err
	}

	if lockErr := usecase.cartService.EnsureCartUnlocked(ctx, cart.Id); lockErr != nil {
		return Cart{}, lockErr
	}

	if clearErr := usecase.cartRepoPort.DeleteCartItemsByCartId(ctx, cart.Id); clearErr != nil {
		return Cart{}, clearErr
	}

	cleared, clearedErr := usecase.cartRepoPort.GetCartById(ctx, cart.Id)
	if clearedErr != nil {
		return Cart{}, clearedErr
	}

	return cleared, nil
}
