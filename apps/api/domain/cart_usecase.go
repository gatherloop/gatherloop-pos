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
	return usecase.attachPendingPayment(ctx, resolveCartAvailability(cart))
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

// findAwaitingPayment is the single definition of "locked": both ensureCartUnlocked (which
// rejects a write) and attachPendingPayment (which explains the lock on the cart response) read
// it, so the two can never disagree (D18).
func (usecase CartUsecase) findAwaitingPayment(ctx context.Context, cartId int64) (Payment, bool, *Error) {
	payment, err := usecase.paymentRepository.GetPendingPaymentByCartId(ctx, cartId)
	if err != nil {
		if err.Type == NotFound {
			return Payment{}, false, nil
		}
		return Payment{}, false, err
	}
	return payment, payment.IsAwaitingPayment(time.Now()), nil
}

func (usecase CartUsecase) ensureCartUnlocked(ctx context.Context, cartId int64) *Error {
	_, awaiting, err := usecase.findAwaitingPayment(ctx, cartId)
	if err != nil {
		return err
	}
	if awaiting {
		return &Error{Type: BadRequest, Message: "cart is locked by a pending payment"}
	}
	return nil
}

func (usecase CartUsecase) attachPendingPayment(ctx context.Context, cart Cart) (Cart, *Error) {
	payment, awaiting, err := usecase.findAwaitingPayment(ctx, cart.Id)
	if err != nil {
		return Cart{}, err
	}
	if awaiting {
		cart.PendingPayment = &payment
	}
	return cart, nil
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
