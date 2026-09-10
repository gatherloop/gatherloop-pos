package domain

import (
	"context"
	"regexp"
	"strings"
)

var tableCodePattern = regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{10}$`)

const maxNoteLength = 255

type CartUsecase struct {
	repository        CartRepository
	variantRepository VariantRepository
	tableRepository   TableRepository
}

func NewCartUsecase(repository CartRepository, variantRepository VariantRepository, tableRepository TableRepository) CartUsecase {
	return CartUsecase{
		repository:        repository,
		variantRepository: variantRepository,
		tableRepository:   tableRepository,
	}
}

func (usecase CartUsecase) GetCurrentCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := usecase.repository.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return emptyCart(sessionId), nil
		}
		return Cart{}, err
	}
	return cart, nil
}

func (usecase CartUsecase) UpdateCartTable(ctx context.Context, sessionId string, tableCode string) (Cart, *Error) {
	if !tableCodePattern.MatchString(tableCode) {
		return Cart{}, &Error{Type: BadRequest, Message: "tableCode is invalid"}
	}

	var result Cart
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		table, tableErr := usecase.tableRepository.GetTableByCode(ctxWithTx, tableCode)
		if tableErr != nil {
			return tableErr
		}

		cart, cartErr := usecase.getOrCreateActiveCart(ctxWithTx, sessionId)
		if cartErr != nil {
			return cartErr
		}

		cart.TableId = &table.Id
		updated, updateErr := usecase.repository.UpdateCartById(ctxWithTx, cart, cart.Id)
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
	if err := validateCartItemInput(amount, note); err != nil {
		return Cart{}, err
	}

	var result Cart
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.validatePurchasableVariant(ctxWithTx, variantId); err != nil {
			return err
		}

		cart, cartErr := usecase.getOrCreateActiveCart(ctxWithTx, sessionId)
		if cartErr != nil {
			return cartErr
		}

		if existing, found := findMatchingCartItem(cart.Items, variantId, note); found {
			existing.Amount += amount
			if _, updateErr := usecase.repository.UpdateCartItemById(ctxWithTx, existing, existing.Id); updateErr != nil {
				return updateErr
			}
		} else {
			item := CartItem{CartId: cart.Id, VariantId: variantId, Amount: amount, Note: note}
			if _, createErr := usecase.repository.CreateCartItem(ctxWithTx, item); createErr != nil {
				return createErr
			}
		}

		refreshed, refreshErr := usecase.repository.GetCartById(ctxWithTx, cart.Id)
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
	if err := validateCartItemInput(amount, note); err != nil {
		return Cart{}, err
	}

	var result Cart
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		cart, ownedErr := usecase.getOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}

		item := CartItem{Amount: amount, Note: note}
		if _, updateErr := usecase.repository.UpdateCartItemById(ctxWithTx, item, cartItemId); updateErr != nil {
			return updateErr
		}

		refreshed, refreshErr := usecase.repository.GetCartById(ctxWithTx, cart.Id)
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
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		cart, ownedErr := usecase.getOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}

		if deleteErr := usecase.repository.DeleteCartItemById(ctxWithTx, cartItemId); deleteErr != nil {
			return deleteErr
		}

		refreshed, refreshErr := usecase.repository.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = refreshed
		return nil
	})

	return result, err
}

func (usecase CartUsecase) ClearCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := usecase.repository.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return emptyCart(sessionId), nil
		}
		return Cart{}, err
	}

	if clearErr := usecase.repository.DeleteCartItemsByCartId(ctx, cart.Id); clearErr != nil {
		return Cart{}, clearErr
	}

	return usecase.repository.GetCartById(ctx, cart.Id)
}

func (usecase CartUsecase) getOrCreateActiveCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := usecase.repository.GetActiveCartBySessionId(ctx, sessionId)
	if err == nil {
		return cart, nil
	}
	if err.Type != NotFound {
		return Cart{}, err
	}
	return usecase.repository.CreateCart(ctx, Cart{SessionId: sessionId, Status: CartStatusActive})
}

func (usecase CartUsecase) getOwnedCart(ctx context.Context, sessionId string, cartItemId int64) (Cart, *Error) {
	cart, err := usecase.repository.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Cart{}, &Error{Type: NotFound, Message: "cart item not found"}
		}
		return Cart{}, err
	}

	for _, item := range cart.Items {
		if item.Id == cartItemId {
			return cart, nil
		}
	}

	return Cart{}, &Error{Type: NotFound, Message: "cart item not found"}
}

func (usecase CartUsecase) validatePurchasableVariant(ctx context.Context, variantId int64) *Error {
	variant, err := usecase.variantRepository.GetVariantById(ctx, variantId)
	if err != nil {
		return err
	}

	if variant.Product.DeletedAt != nil || variant.Product.Status != ProductStatusPublished || variant.Product.SaleType != SaleTypePurchase {
		return &Error{Type: BadRequest, Message: "variant is not available for ordering"}
	}

	return nil
}

func validateCartItemInput(amount float32, note string) *Error {
	if amount < 1 || amount != float32(int64(amount)) {
		return &Error{Type: BadRequest, Message: "amount must be an integer >= 1"}
	}
	if len(note) > maxNoteLength {
		return &Error{Type: BadRequest, Message: "note must be at most 255 characters"}
	}
	return nil
}

func findMatchingCartItem(items []CartItem, variantId int64, note string) (CartItem, bool) {
	for _, item := range items {
		if item.VariantId == variantId && strings.TrimSpace(item.Note) == note {
			return item, true
		}
	}
	return CartItem{}, false
}

func emptyCart(sessionId string) Cart {
	return Cart{SessionId: sessionId, Status: CartStatusActive, Items: []CartItem{}}
}
