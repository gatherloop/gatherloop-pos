package domain

import "time"

type AvailabilityMovementReason string

const (
	AvailabilityMovementReasonSale         AvailabilityMovementReason = "sale"
	AvailabilityMovementReasonSaleReversal AvailabilityMovementReason = "sale_reversal"
	AvailabilityMovementReasonManualSet    AvailabilityMovementReason = "manual_set"
	AvailabilityMovementReasonManualAdjust AvailabilityMovementReason = "manual_adjust"
	AvailabilityMovementReasonSwitchedOff  AvailabilityMovementReason = "switched_off"
	AvailabilityMovementReasonSwitchedOn   AvailabilityMovementReason = "switched_on"
)

type AvailabilityMovementLevel string

const (
	AvailabilityMovementLevelProduct AvailabilityMovementLevel = "product"
	AvailabilityMovementLevelVariant AvailabilityMovementLevel = "variant"
)

type AvailabilityMovement struct {
	Id                int64
	ProductId         *int64
	VariantId         *int64
	Delta             *int
	ResultingQuantity *int
	Reason            AvailabilityMovementReason
	TransactionId     *int64
	Note              string
	CreatedAt         time.Time
}

func availabilityMovementTransactionId(items []TransactionItem) *int64 {
	for _, item := range items {
		if item.TransactionId != 0 {
			id := item.TransactionId
			return &id
		}
	}
	return nil
}
