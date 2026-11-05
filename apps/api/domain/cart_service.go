package domain

import (
	"context"
	"fmt"
	"time"
)

type CartService struct {
	cartRepoPort    CartRepoPort
	paymentRepoPort PaymentRepoPort
	variantRepoPort VariantRepoPort
}

func NewCartService(
	cartRepoPort CartRepoPort,
	paymentRepoPort PaymentRepoPort,
	variantRepoPort VariantRepoPort,
) CartService {
	return CartService{
		cartRepoPort:    cartRepoPort,
		paymentRepoPort: paymentRepoPort,
		variantRepoPort: variantRepoPort,
	}
}

func (service CartService) FindAwaitingPayment(ctx context.Context, cartId int64) (Payment, bool, *Error) {
	payment, err := service.paymentRepoPort.GetPendingPaymentByCartId(ctx, cartId)
	if err != nil {
		if err.Type == NotFound {
			return Payment{}, false, nil
		}
		return Payment{}, false, err
	}
	return payment, payment.IsAwaitingPayment(time.Now()), nil
}

func (service CartService) EnsureCartUnlocked(ctx context.Context, cartId int64) *Error {
	_, awaiting, err := service.FindAwaitingPayment(ctx, cartId)
	if err != nil {
		return err
	}
	if awaiting {
		return &Error{Type: BadRequest, Message: "cart is locked by a pending payment"}
	}
	return nil
}

func (service CartService) AttachPendingPayment(ctx context.Context, cart Cart) (Cart, *Error) {
	payment, awaiting, err := service.FindAwaitingPayment(ctx, cart.Id)
	if err != nil {
		return Cart{}, err
	}
	if awaiting {
		cart.PendingPayment = &payment
	}
	return cart, nil
}

func (service CartService) GetOrCreateActiveCart(ctx context.Context, sessionId string) (Cart, *Error) {
	cart, err := service.cartRepoPort.GetActiveCartBySessionId(ctx, sessionId)
	if err == nil {
		return cart, nil
	}
	if err.Type != NotFound {
		return Cart{}, err
	}
	return service.cartRepoPort.CreateCart(ctx, Cart{SessionId: sessionId, Status: CartStatusActive})
}

func (service CartService) GetOwnedCart(ctx context.Context, sessionId string, cartItemId int64) (Cart, CartItem, *Error) {
	cart, err := service.cartRepoPort.GetActiveCartBySessionId(ctx, sessionId)
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

func (service CartService) ValidatePurchasableVariant(ctx context.Context, variantId int64) (Variant, *Error) {
	variant, err := service.variantRepoPort.GetVariantById(ctx, variantId)
	if err != nil {
		return Variant{}, err
	}

	product := variant.Product
	if product.DeletedAt != nil || product.Status != ProductStatusPublished || product.SaleType != SaleTypePurchase {
		return Variant{}, &Error{Type: BadRequest, Message: "variant is not available for ordering"}
	}

	if !variant.IsSellable() {
		return Variant{}, &Error{Type: BadRequest, Message: fmt.Sprintf("%s is sold out", availabilityItemName(product, variant))}
	}

	return variant, nil
}
