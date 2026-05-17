package domain

import "time"

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
	MaterialSuppliers []MaterialSupplier
	DeletedAt        *time.Time
	CreatedAt        time.Time
}
