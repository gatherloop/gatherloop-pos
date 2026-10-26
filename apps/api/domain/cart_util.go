package domain

import (
	"fmt"
	"strings"
)

func resolveCartAvailability(cart Cart) Cart {
	items := make([]CartItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		item.Variant = resolveVariantAvailability(item.Variant, item.Variant.Product)
		items = append(items, item)
	}
	cart.Items = items
	return cart
}

func emptyCart(sessionId string) Cart {
	return Cart{SessionId: sessionId, Status: CartStatusActive, Items: []CartItem{}}
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

func checkCartCapacity(items []CartItem, product Product, variant Variant, excludeItemId int64, amount float32) *Error {
	remaining := getVariantSellableQuantity(product, variant)
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

func findMatchingCartItem(items []CartItem, variantId int64, note string) (CartItem, bool) {
	for _, item := range items {
		if item.VariantId == variantId && strings.TrimSpace(item.Note) == note {
			return item, true
		}
	}
	return CartItem{}, false
}
