package domain

import "time"

type AvailabilityVariant struct {
	VariantId         int64
	VariantName       string
	IsAvailable       bool
	AvailableQuantity *int
	IsSellable        bool
	SellableQuantity  *int
}

type AvailabilityProduct struct {
	ProductId            int64
	ProductName          string
	CategoryId           int64
	CategoryName         string
	AvailabilityTracking AvailabilityTracking
	IsAvailable          bool
	AvailableQuantity    *int
	IsSellable           bool
	SellableQuantity     *int
	Variants             []AvailabilityVariant
}

type AvailabilityProductUpdate struct {
	ProductId         int64
	IsAvailable       *bool
	AvailableQuantity *int
}

type AvailabilityVariantUpdate struct {
	VariantId         int64
	IsAvailable       *bool
	AvailableQuantity *int
}

func ToAvailabilityProduct(product Product) AvailabilityProduct {
	availabilityVariants := make([]AvailabilityVariant, 0, len(product.Variants))
	for _, variant := range product.Variants {
		availabilityVariants = append(availabilityVariants, toAvailabilityVariant(variant))
	}

	return AvailabilityProduct{
		ProductId:            product.Id,
		ProductName:          product.Name,
		CategoryId:           product.CategoryId,
		CategoryName:         product.Category.Name,
		AvailabilityTracking: product.AvailabilityTracking,
		IsAvailable:          product.IsAvailable,
		AvailableQuantity:    product.AvailableQuantity,
		IsSellable:           product.IsSellable(),
		SellableQuantity:     product.SellableQuantity(),
		Variants:             availabilityVariants,
	}
}

func toAvailabilityVariant(variant Variant) AvailabilityVariant {
	return AvailabilityVariant{
		VariantId:         variant.Id,
		VariantName:       variant.Name,
		IsAvailable:       variant.IsAvailable,
		AvailableQuantity: variant.AvailableQuantity,
		IsSellable:        variant.IsSellable(),
		SellableQuantity:  variant.SellableQuantity(),
	}
}

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

type availabilityCountingLevel int

const (
	availabilityCountingProduct availabilityCountingLevel = iota
	availabilityCountingVariant
)

type availabilityCountingUnit struct {
	level availabilityCountingLevel
	id    int64
}
