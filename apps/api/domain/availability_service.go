package domain

import (
	"context"
	"fmt"
	"math"
)

type AvailabilityService struct {
	productRepoPort      ProductRepoPort
	variantRepoPort      VariantRepoPort
	availabilityRepoPort AvailabilityRepoPort
}

func NewAvailabilityService(
	productRepoPort ProductRepoPort,
	variantRepoPort VariantRepoPort,
	availabilityRepoPort AvailabilityRepoPort,
) AvailabilityService {
	return AvailabilityService{
		productRepoPort:      productRepoPort,
		variantRepoPort:      variantRepoPort,
		availabilityRepoPort: availabilityRepoPort,
	}
}

func (service AvailabilityService) BuildAvailabilityList(ctx context.Context) ([]AvailabilityProduct, *Error) {
	purchase := SaleTypePurchase
	published := ProductStatusPublished

	products, err := service.productRepoPort.GetProductList(ctx, "", CreatedAt, Ascending, 0, 0, &purchase, &published)
	if err != nil {
		return []AvailabilityProduct{}, err
	}

	availabilityProducts := make([]AvailabilityProduct, 0, len(products))
	for _, product := range products {
		availabilityProducts = append(availabilityProducts, ToAvailabilityProduct(product))
	}

	return availabilityProducts, nil
}

func (service AvailabilityService) RecordProductAvailabilityMovements(ctx context.Context, product Product, update AvailabilityProductUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if product.AvailableQuantity != nil {
			previous = *product.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			ProductId: &product.Id, Delta: &delta, ResultingQuantity: &resultingQuantity,
			Reason: AvailabilityMovementReasonManualSet,
		}); err != nil {
			return err
		}
	}

	if update.IsAvailable != nil && *update.IsAvailable != product.IsAvailable {
		reason := AvailabilityMovementReasonSwitchedOn
		if !*update.IsAvailable {
			reason = AvailabilityMovementReasonSwitchedOff
		}

		if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			ProductId: &product.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (service AvailabilityService) RecordVariantAvailabilityMovements(ctx context.Context, variant Variant, update AvailabilityVariantUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if variant.AvailableQuantity != nil {
			previous = *variant.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			VariantId: &variant.Id, Delta: &delta, ResultingQuantity: &resultingQuantity,
			Reason: AvailabilityMovementReasonManualSet,
		}); err != nil {
			return err
		}
	}

	if update.IsAvailable != nil && *update.IsAvailable != variant.IsAvailable {
		reason := AvailabilityMovementReasonSwitchedOn
		if !*update.IsAvailable {
			reason = AvailabilityMovementReasonSwitchedOff
		}

		if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			VariantId: &variant.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (service AvailabilityService) Reserve(ctx context.Context, items []TransactionItem) *Error {
	return service.adjust(ctx, items, -1, true, AvailabilityMovementReasonSale)
}

// Release restores availability previously reserved for the given items. It is never blocked by a
// switch or a shortfall, since it only ever reverses a reservation this collaborator made earlier.
func (service AvailabilityService) Release(ctx context.Context, items []TransactionItem) *Error {
	return service.adjust(ctx, items, 1, false, AvailabilityMovementReasonSaleReversal)
}

// ForceReserve decrements availability for the given items without checking switches or shortfalls,
// allowing the counter to go negative. Used for a QRIS payment that arrives after its reservation was
// already released by expiry (D7): the gateway has captured the money, so the reservation must succeed.
func (service AvailabilityService) ForceReserve(ctx context.Context, items []TransactionItem) *Error {
	return service.adjust(ctx, items, -1, false, AvailabilityMovementReasonSale)
}

// ApplyDelta reserves or releases, per counting unit, the difference between a transaction's
// existing item set and its incoming one — so editing an unpaid transaction adjusts availability
// by exactly what changed instead of releasing and re-reserving the whole order. Only units whose
// net amount increases are validated against a shortfall or a switched-off item.
func (service AvailabilityService) ApplyDelta(ctx context.Context, oldItems []TransactionItem, newItems []TransactionItem) *Error {
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
				lockedVariant, err := service.availabilityRepoPort.LockVariantById(ctx, item.VariantId)
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
					lockedProduct, err := service.availabilityRepoPort.LockProductById(ctx, product.Id)
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

	transactionId := availabilityMovementTransactionId(newItems)
	if transactionId == nil {
		transactionId = availabilityMovementTransactionId(oldItems)
	}

	for unit := range units {
		amountDelta := newAmountsByUnit[unit] - oldAmountsByUnit[unit]
		if amountDelta == 0 {
			continue
		}

		quantityDelta := -int(math.Round(float64(amountDelta)))
		validate := quantityDelta < 0

		reason := AvailabilityMovementReasonSaleReversal
		if quantityDelta < 0 {
			reason = AvailabilityMovementReasonSale
		}

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
			if err := service.availabilityRepoPort.UpdateProductAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
			productId := unit.id
			if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
				ProductId: &productId, Delta: &quantityDelta, ResultingQuantity: &newQuantity,
				Reason: reason, TransactionId: transactionId,
			}); err != nil {
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
			if err := service.availabilityRepoPort.UpdateVariantAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
			variantId := unit.id
			if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
				VariantId: &variantId, Delta: &quantityDelta, ResultingQuantity: &newQuantity,
				Reason: reason, TransactionId: transactionId,
			}); err != nil {
				return err
			}
		}
	}

	return nil
}

func (service AvailabilityService) adjust(ctx context.Context, items []TransactionItem, sign int, validate bool, reason AvailabilityMovementReason) *Error {
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
			lockedVariant, err := service.availabilityRepoPort.LockVariantById(ctx, item.VariantId)
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
				lockedProduct, err := service.availabilityRepoPort.LockProductById(ctx, product.Id)
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

	transactionId := availabilityMovementTransactionId(items)

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
			if err := service.availabilityRepoPort.UpdateProductAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
			productId := unit.id
			if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
				ProductId: &productId, Delta: &delta, ResultingQuantity: &newQuantity,
				Reason: reason, TransactionId: transactionId,
			}); err != nil {
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
			if err := service.availabilityRepoPort.UpdateVariantAvailableQuantity(ctx, unit.id, newQuantity); err != nil {
				return err
			}
			variantId := unit.id
			if err := service.availabilityRepoPort.CreateAvailabilityMovement(ctx, AvailabilityMovement{
				VariantId: &variantId, Delta: &delta, ResultingQuantity: &newQuantity,
				Reason: reason, TransactionId: transactionId,
			}); err != nil {
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
