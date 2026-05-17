package mysql

import "time"

type Material struct {
	Id               int64
	Name             string
	Price            float32
	Unit             string
	Description      *string
	PurchaseUnit     string
	PurchaseUnitSize float32
	MinimumStock     int
	NormalStock      int
	DeletedAt        *time.Time
	CreatedAt        time.Time
}

type MaterialUsage struct {
	ID     int64   `gorm:"column:id"`
	Amount float32 `gorm:"column:amount"`
}

type materialSupplierRow struct {
	MaterialId   int64 `gorm:"column:material_id"`
	SupplierId   int64 `gorm:"column:supplier_id"`
	Name         string
	Phone        *string
	Address      string
	PurchaseType string `gorm:"column:purchase_type"`
	PurchaseUrl  string `gorm:"column:purchase_url"`
}

type materialSupplierInsertRow struct {
	MaterialId   int64  `gorm:"column:material_id"`
	SupplierId   int64  `gorm:"column:supplier_id"`
	PurchaseType string `gorm:"column:purchase_type"`
	PurchaseUrl  string `gorm:"column:purchase_url"`
}
