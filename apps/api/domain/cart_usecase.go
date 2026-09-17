package domain

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var tableCodePattern = regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{10}$`)

const maxNoteLength = 255

type CartUsecase struct {
	repository        CartRepository
	variantRepository VariantRepository
	tableRepository   TableRepository
	paymentRepository PaymentRepository
}

func NewCartUsecase(repository CartRepository, variantRepository VariantRepository, tableRepository TableRepository, paymentRepository PaymentRepository) CartUsecase {
	return CartUsecase{
		repository:        repository,
		variantRepository: variantRepository,
		tableRepository:   tableRepository,
		paymentRepository: paymentRepository,
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
	return resolveCartAvailability(cart), nil
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
		if lockErr := usecase.ensureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		cart.TableId = &table.Id
		updated, updateErr := usecase.repository.UpdateCartById(ctxWithTx, cart, cart.Id)
		if updateErr != nil {
			return updateErr
		}
		result = resolveCartAvailability(updated)
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
		variant, err := usecase.validatePurchasableVariant(ctxWithTx, variantId)
		if err != nil {
			return err
		}

		cart, cartErr := usecase.getOrCreateActiveCart(ctxWithTx, sessionId)
		if cartErr != nil {
			return cartErr
		}
		if lockErr := usecase.ensureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if capacityErr := checkCartCapacity(cart.Items, variant.Product, variant, 0, amount); capacityErr != nil {
			return capacityErr
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
		result = resolveCartAvailability(refreshed)
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
		cart, existing, ownedErr := usecase.getOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}
		if lockErr := usecase.ensureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if capacityErr := checkCartCapacity(cart.Items, existing.Variant.Product, existing.Variant, cartItemId, amount); capacityErr != nil {
			return capacityErr
		}

		item := CartItem{Amount: amount, Note: note}
		if _, updateErr := usecase.repository.UpdateCartItemById(ctxWithTx, item, cartItemId); updateErr != nil {
			return updateErr
		}

		refreshed, refreshErr := usecase.repository.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = resolveCartAvailability(refreshed)
		return nil
	})

	return result, err
}

func (usecase CartUsecase) RemoveCartItem(ctx context.Context, sessionId string, cartItemId int64) (Cart, *Error) {
	var result Cart
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		cart, _, ownedErr := usecase.getOwnedCart(ctxWithTx, sessionId, cartItemId)
		if ownedErr != nil {
			return ownedErr
		}
		if lockErr := usecase.ensureCartUnlocked(ctxWithTx, cart.Id); lockErr != nil {
			return lockErr
		}

		if deleteErr := usecase.repository.DeleteCartItemById(ctxWithTx, cartItemId); deleteErr != nil {
			return deleteErr
		}

		refreshed, refreshErr := usecase.repository.GetCartById(ctxWithTx, cart.Id)
		if refreshErr != nil {
			return refreshErr
		}
		result = resolveCartAvailability(refreshed)
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

	if lockErr := usecase.ensureCartUnlocked(ctx, cart.Id); lockErr != nil {
		return Cart{}, lockErr
	}

	if clearErr := usecase.repository.DeleteCartItemsByCartId(ctx, cart.Id); clearErr != nil {
		return Cart{}, clearErr
	}

	cleared, clearedErr := usecase.repository.GetCartById(ctx, cart.Id)
	if clearedErr != nil {
		return Cart{}, clearedErr
	}

	return resolveCartAvailability(cleared), nil
}

// resolveCartAvailability fills the computed IsSellable/SellableQuantity fields, which the cart
// repository cannot read from the database because they are derived, not stored.
func resolveCartAvailability(cart Cart) Cart {
	items := make([]CartItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		item.Variant = resolveVariantAvailability(item.Variant, item.Variant.Product)
		items = append(items, item)
	}
	cart.Items = items
	return cart
}

func (usecase CartUsecase) ensureCartUnlocked(ctx context.Context, cartId int64) *Error {
	payment, err := usecase.paymentRepository.GetPendingPaymentByCartId(ctx, cartId)
	if err != nil {
		if err.Type == NotFound {
			return nil
		}
		return err
	}
	if payment.IsAwaitingPayment(time.Now()) {
		return &Error{Type: BadRequest, Message: "cart is locked by a pending payment"}
	}
	return nil
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

func (usecase CartUsecase) getOwnedCart(ctx context.Context, sessionId string, cartItemId int64) (Cart, CartItem, *Error) {
	cart, err := usecase.repository.GetActiveCartBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Cart{}, CartItem{}, &Error{Type: NotFound, Message: "cart item not found"}
		}
		return Cart{}, CartItem{}, err
	}

	for _, item := range cart.Items {
		if item.Id == cartItemId {
			return cart, item, nil
		}
	}

	return Cart{}, CartItem{}, &Error{Type: NotFound, Message: "cart item not found"}
}

func (usecase CartUsecase) validatePurchasableVariant(ctx context.Context, variantId int64) (Variant, *Error) {
	variant, err := usecase.variantRepository.GetVariantById(ctx, variantId)
	if err != nil {
		return Variant{}, err
	}

	product := variant.Product
	if product.DeletedAt != nil || product.Status != ProductStatusPublished || product.SaleType != SaleTypePurchase {
		return Variant{}, &Error{Type: BadRequest, Message: "variant is not available for ordering"}
	}

	if isSellable, _ := ResolveVariantAvailability(product, variant); !isSellable {
		return Variant{}, &Error{Type: BadRequest, Message: fmt.Sprintf("%s is sold out", availabilityItemName(product, variant))}
	}

	return variant, nil
}

// checkCartCapacity rejects an amount that would push the counting unit shared by product and
// variant past what remains, counting every other line in the cart against the same unit.
// excludeItemId skips the line being updated so its old amount isn't counted twice.
func checkCartCapacity(items []CartItem, product Product, variant Variant, excludeItemId int64, amount float32) *Error {
	remaining := variantSellableQuantity(product, variant)
	if remaining == nil {
		return nil
	}

	held := float32(0)
	for _, item := range items {
		if item.Id == excludeItemId || !sameAvailabilityCountingUnit(product, variant, item) {
			continue
		}
		held += item.Amount
	}

	if held+amount > float32(*remaining) {
		return &Error{Type: BadRequest, Message: fmt.Sprintf("only %d %s left", *remaining, availabilityItemName(product, variant))}
	}

	return nil
}

func sameAvailabilityCountingUnit(product Product, variant Variant, item CartItem) bool {
	switch product.AvailabilityTracking {
	case AvailabilityTrackingProduct:
		return item.Variant.ProductId == product.Id
	case AvailabilityTrackingVariant:
		return item.VariantId == variant.Id
	default:
		return false
	}
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
