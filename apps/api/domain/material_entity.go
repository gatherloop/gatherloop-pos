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
	MinimumStock     int64
	NormalStock      int64
	Suppliers        []MaterialSupplier
	DeletedAt        *time.Time
	CreatedAt        time.Time
}
