package domain

import "time"

type PurchaseType string

const (
	PurchaseTypeOffline  PurchaseType = "offline"
	PurchaseTypeOnline   PurchaseType = "online"
	PurchaseTypeDelivery PurchaseType = "delivery"
)

type MaterialSupplier struct {
	SupplierId   int64
	SupplierName string
	Address      string
	Phone        string
	PurchaseType PurchaseType
	PurchaseUrl  string
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
	MinimumStock     int
	NormalStock      int
	Suppliers        []MaterialSupplier
	DeletedAt        *time.Time
	CreatedAt        time.Time
}
