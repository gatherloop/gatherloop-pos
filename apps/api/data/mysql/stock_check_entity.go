package mysql

import "time"

type StockCheck struct {
	Id        int64
	CreatedAt time.Time
	DeletedAt *time.Time
	Items     []StockCheckItem `gorm:"foreignKey:StockCheckId"`
}

type StockCheckItem struct {
	Id               int64
	StockCheckId     int64
	MaterialId       int64
	CurrentStock     int
	MaterialName     string
	Price            float32
	PurchaseUnit     string
	PurchaseUnitSize float32
	MinimumStock     int
	NormalStock      int
	CreatedAt        time.Time
}
