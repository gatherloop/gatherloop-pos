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
	PurchaseUrl  string
	DeletedAt    *time.Time
	CreatedAt    time.Time
}

type Material struct {
	Id               int64
	Name             string
	Price            float32
	Unit             string
	WeeklyUsage      float32
	Description      *string
	PurchaseUnit     string
	PurchaseUnitSize float32
	MinimumStock     int64
	NormalStock      int64
	Suppliers        []MaterialSupplier
	DeletedAt        *time.Time
	CreatedAt        time.Time
}
