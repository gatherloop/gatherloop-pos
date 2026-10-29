package domain

import (
	"fmt"
	"strings"
	"time"
)

type CartStatus string

const (
	CartStatusActive    CartStatus = "active"
	CartStatusConverted CartStatus = "converted"
	CartStatusAbandoned CartStatus = "abandoned"
)

type CartItem struct {
	Id        int64
	CartId    int64
	VariantId int64
	Variant   Variant
	Amount    float32
	Note      string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

const maxNoteLength = 255

func (item CartItem) Validate() *Error {
	if item.Amount < 1 || item.Amount != float32(int64(item.Amount)) {
		return &Error{Type: BadRequest, Message: "amount must be an integer >= 1"}
	}
	if len(item.Note) > maxNoteLength {
		return &Error{Type: BadRequest, Message: "note must be at most 255 characters"}
	}
	return nil
}

type Cart struct {
	Id             int64
	SessionId      string
	TableId        *int64
	Table          *Table
	Status         CartStatus
	Items          []CartItem
	PendingPayment *Payment
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}

func (cart Cart) CheckCapacity(product Product, variant Variant, excludeItemId int64, amount float32) *Error {
	remaining := variant.SellableQuantity()
	if remaining == nil {
		return nil
	}

	held := float32(0)
	for _, item := range cart.Items {
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

func (cart Cart) FindMatchingCartItem(variantId int64, note string) (CartItem, bool) {
	for _, item := range cart.Items {
		if item.VariantId == variantId && strings.TrimSpace(item.Note) == note {
			return item, true
		}
	}
	return CartItem{}, false
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
