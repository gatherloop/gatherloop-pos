package domain

import "time"

type PurchaseType string

const (
	PurchaseTypeOnline   PurchaseType = "online"
	PurchaseTypeOffline  PurchaseType = "offline"
	PurchaseTypeDelivery PurchaseType = "delivery"
)

type MaterialSupplier struct {
	Id           int64
	MaterialId   int64
	SupplierId   int64
	Supplier     Supplier
	PurchaseType PurchaseType
	PurchaseUrl  *string
	DeletedAt    *time.Time
	CreatedAt    time.Time
}
