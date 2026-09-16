//go:generate mockgen -source=availability_reservation.go -destination=../data/mock/availability_reservation_repository.go -package=mock

package domain

import (
	"context"
	"fmt"
	"math"
)

type AvailabilityReservationRepository interface {
	LockVariantById(ctx context.Context, id int64) (Variant, *Error)
	LockProductById(ctx context.Context, id int64) (Product, *Error)
	UpdateVariantAvailableQuantity(ctx context.Context, id int64, quantity int) *Error
	UpdateProductAvailableQuantity(ctx context.Context, id int64, quantity int) *Error
}

type AvailabilityReservation struct {
	repository AvailabilityReservationRepository
}

func NewAvailabilityReservation(repository AvailabilityReservationRepository) AvailabilityReservation {
	return AvailabilityReservation{repository: repository}
}

// Reserve decrements availability for the given items, summed per counting unit, and rejects the
// whole batch with the offending item's name on a shortfall or a switched-off item.
func (reservation AvailabilityReservation) Reserve(ctx context.Context, items []TransactionItem) *Error {
	return reservation.adjust(ctx, items, -1, true)
}

// Release restores availability previously reserved for the given items. It is never blocked by a
// switch or a shortfall, since it only ever reverses a reservation this collaborator made earlier.
func (reservation AvailabilityReservation) Release(ctx context.Context, items []TransactionItem) *Error {
	return reservation.adjust(ctx, items, 1, false)
}

// ForceReserve decrements availability for the given items without checking switches or shortfalls,
// allowing the counter to go negative. Used for a QRIS payment that arrives after its reservation was
// already released by expiry (D7): the gateway has captured the money, so the reservation must succeed.
func (reservation AvailabilityReservation) ForceReserve(ctx context.Context, items []TransactionItem) *Error {
	return reservation.adjust(ctx, items, -1, false)
}

// ApplyDelta reserves or releases, per counting unit, the difference between a transaction's
// existing item set and its incoming one — so editing an unpaid transaction adjusts availability
// by exactly what changed instead of releasing and re-reserving the whole order. Only units whose
// net amount increases are validated against a shortfall or a switched-off item.
func (reservation AvailabilityReservation) ApplyDelta(ctx context.Context, oldItems []TransactionItem, newItems []TransactionItem) *Error {
	variantsById := map[int64]Variant{}
	productsById := map[int64]Product{}
	namesByUnit := map[availabilityCountingUnit]string{}

	load := func(items []TransactionItem, validateSwitch bool) (map[availabilityCountingUnit]float32, *Error) {
		amountsByUnit := map[availabilityCountingUnit]float32{}

		for _, item := range items {
			if item.RentalId != nil {
				continue
			}

			variant, ok := variantsById[item.VariantId]
			if !ok {
				lockedVariant, err := reservation.repository.LockVariantById(ctx, item.VariantId)
				if err != nil {
					return nil, err
				}
				variant = lockedVariant
				variantsById[item.VariantId] = variant
			}

			product := variant.Product
			if product.SaleType == SaleTypeRental {
				continue
			}

			if validateSwitch && (!product.IsAvailable || !variant.IsAvailable) {
				return nil, &Error{Type: BadRequest, Message: fmt.Sprintf("%s is sold out", availabilityItemName(product, variant))}
			}

			switch product.AvailabilityTracking {
			case AvailabilityTrackingProduct:
				if _, ok := productsById[product.Id]; !ok {
					lockedProduct, err := reservation.repository.LockProductById(ctx, product.Id)
					if err != nil {
						return nil, err
					}
					productsById[product.Id] = lockedProduct
				}
				unit := availabilityCountingUnit{level: availabilityCountingProduct, id: product.Id}
				amountsByUnit[unit] += item.Amount
				namesByUnit[unit] = product.Name
			case AvailabilityTrackingVariant:
				unit := availabilityCountingUnit{level: availabilityCountingVariant, id: variant.Id}
				amountsByUnit[unit] += item.Amount
				namesByUnit[unit] = availabilityItemName(product, variant)
			}
		}

		return amountsByUnit, nil
	}

	oldAmountsByUnit, err := load(oldItems, false)
	if err != nil {
		return err
	}

	newAmountsByUnit, err := load(newItems, true)
	if err != nil {
		return err
	}

	units := map[availabilityCountingUnit]bool{}
	for unit := range oldAmountsByUnit {
		units[unit] = true
	}
	for unit := range newAmountsByUnit {
		units[unit] = true
	}

	for unit := range units {
		amountDelta := newAmountsByUnit[unit] - oldAmountsByUnit[unit]
		if amountDelta == 0 {
			continue
		}

		quantityDelta := -int(math.Round(float64(amountDelta)))
		validate := quantityDelta < 0

		switch unit.level {
		case availabilityCountingProduct:
			product := productsById[unit.id]
			current := 0
			if product.AvailableQuantity != nil {
				current = *product.AvailableQuantity
			}
			newQuantity := current + quantityDelta
			if validate && newQuantity < 0 {
				return &Error{Type: BadRequest, Message: fmt.Sprintf("only %d %s left", current, namesByUnit[unit])}
			}
			if err := reservation.repository.UpdateProductAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
		case availabilityCountingVariant:
			variant := variantsById[unit.id]
			current := 0
			if variant.AvailableQuantity != nil {
				current = *variant.AvailableQuantity
			}
			newQuantity := current + quantityDelta
			if validate && newQuantity < 0 {
				return &Error{Type: BadRequest, Message: fmt.Sprintf("only %d %s left", current, namesByUnit[unit])}
			}
			if err := reservation.repository.UpdateVariantAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
		}
	}

	return nil
}

type availabilityCountingLevel int

const (
	availabilityCountingProduct availabilityCountingLevel = iota
	availabilityCountingVariant
)

type availabilityCountingUnit struct {
	level availabilityCountingLevel
	id    int64
}

func (reservation AvailabilityReservation) adjust(ctx context.Context, items []TransactionItem, sign int, validate bool) *Error {
	variantsById := map[int64]Variant{}
	productsById := map[int64]Product{}
	amountsByUnit := map[availabilityCountingUnit]float32{}
	namesByUnit := map[availabilityCountingUnit]string{}

	for _, item := range items {
		if item.RentalId != nil {
			continue
		}

		variant, ok := variantsById[item.VariantId]
		if !ok {
			lockedVariant, err := reservation.repository.LockVariantById(ctx, item.VariantId)
			if err != nil {
				return err
			}
			variant = lockedVariant
			variantsById[item.VariantId] = variant
		}

		product := variant.Product
		if product.SaleType == SaleTypeRental {
			continue
		}

		if validate && (!product.IsAvailable || !variant.IsAvailable) {
			return &Error{Type: BadRequest, Message: fmt.Sprintf("%s is sold out", availabilityItemName(product, variant))}
		}

		switch product.AvailabilityTracking {
		case AvailabilityTrackingProduct:
			if _, ok := productsById[product.Id]; !ok {
				lockedProduct, err := reservation.repository.LockProductById(ctx, product.Id)
				if err != nil {
					return err
				}
				productsById[product.Id] = lockedProduct
			}
			unit := availabilityCountingUnit{level: availabilityCountingProduct, id: product.Id}
			amountsByUnit[unit] += item.Amount
			namesByUnit[unit] = product.Name
		case AvailabilityTrackingVariant:
			unit := availabilityCountingUnit{level: availabilityCountingVariant, id: variant.Id}
			amountsByUnit[unit] += item.Amount
			namesByUnit[unit] = availabilityItemName(product, variant)
		}
	}

	for unit, amount := range amountsByUnit {
		delta := int(math.Round(float64(amount))) * sign

		switch unit.level {
		case availabilityCountingProduct:
			product := productsById[unit.id]
			current := 0
			if product.AvailableQuantity != nil {
				current = *product.AvailableQuantity
			}
			newQuantity := current + delta
			if validate && newQuantity < 0 {
				return &Error{Type: BadRequest, Message: fmt.Sprintf("only %d %s left", current, namesByUnit[unit])}
			}
			if err := reservation.repository.UpdateProductAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
		case availabilityCountingVariant:
			variant := variantsById[unit.id]
			current := 0
			if variant.AvailableQuantity != nil {
				current = *variant.AvailableQuantity
			}
			newQuantity := current + delta
			if validate && newQuantity < 0 {
				return &Error{Type: BadRequest, Message: fmt.Sprintf("only %d %s left", current, namesByUnit[unit])}
			}
			if err := reservation.repository.UpdateVariantAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
		}
	}

	return nil
}

func availabilityItemName(product Product, variant Variant) string {
	if variant.Name == "" || variant.Name == product.Name {
		return product.Name
	}
	return fmt.Sprintf("%s %s", product.Name, variant.Name)
}
