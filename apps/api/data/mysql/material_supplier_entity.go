package mysql

import "time"

type MaterialSupplier struct {
	Id           int64
	MaterialId   int64
	SupplierId   int64
	Supplier     Supplier
	PurchaseType string
	PurchaseUrl  *string
	DeletedAt    *time.Time
	CreatedAt    time.Time
}
