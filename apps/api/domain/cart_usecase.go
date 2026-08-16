package domain

import (
	"context"
	"regexp"
	"strings"
)

// tableCodePattern is Crockford base32 (D6, matching GenerateTableCode's
// alphabet) — a tableCode that cannot possibly match a real code is
// rejected before touching the DB.
var tableCodePattern = regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{10}$`)

// maxNoteLength matches cart_items.note's VARCHAR(255) column.
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

// GetCurrentCart returns the session's active cart, or an empty, unpersisted
// cart if none exists yet — the active cart is created lazily on first write
// (FR-3), so a GET must never itself create one, and must never 404.
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

// UpdateCartTable resolves a table QR code and attaches it to the session's
// active cart, creating the cart if this is the session's first write. The
// client never sends a table id, only the code read off the QR (FR-3).
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

// AddCartItem adds a line to the session's active cart, creating the cart if
// this is the session's first write. Adding an item whose variant and
// trimmed note match an existing line increments that line instead of
// creating a second one (D9).
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

// UpdateCartItem updates a line's amount and note. Cross-session access is
// impossible by construction (D8): the item must belong to a line already
// resolved through this session's active cart before it is touched.
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

// RemoveCartItem removes a line from the session's active cart. See
// UpdateCartItem for the session-scoping rationale (D8).
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

// ClearCart empties the session's active cart. A session with no cart yet
// has nothing to clear, so it resolves to the same empty cart GetCurrentCart
// would return rather than an error.
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

// getOrCreateActiveCart implements the "created lazily on first write" rule
// (FR-3). Callers run it inside a transaction so the read-then-create is
// atomic against a concurrent write from the same session.
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

// getOwnedCart resolves cartItemId only through the session's own active
// cart, so a cart item id from another session's cart can never be reached
// (D8) — an unrelated or foreign id is indistinguishable from a missing one.
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

// validatePurchasableVariant enforces that a cart line can only ever
// resolve to a variant of a published, purchase product (FR-3) — the same
// rule the public catalog enforces on reads (D2).
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
