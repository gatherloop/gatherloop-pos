package mysql

import "time"

type MaterialSupplier struct {
	Id           int64
	MaterialId   int64
	SupplierId   int64
	Supplier     Supplier
	PurchaseType string
	PurchaseUrl  string
	DeletedAt    *time.Time
	CreatedAt    time.Time
}

type Material struct {
	Id               int64
	Name             string
	Price            float32
	Unit             string
	Description      *string
	PurchaseUnit     string
	PurchaseUnitSize float32
	MinimumStock     int64
	NormalStock      int64
	Suppliers        []MaterialSupplier
	DeletedAt        *time.Time
	CreatedAt        time.Time
}

type MaterialUsage struct {
	ID     int64   `gorm:"column:id"`
	Amount float32 `gorm:"column:amount"`
}
