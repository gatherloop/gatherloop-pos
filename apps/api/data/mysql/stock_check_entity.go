package mysql

import "time"

type StockCheck struct {
	Id        int64
	CheckDate string // stored as DATE, scanned as YYYY-MM-DD string
	Note      *string
	CreatedBy int64
	CreatedAt time.Time
	DeletedAt *time.Time
	Items     []StockCheckItem `gorm:"foreignKey:StockCheckId"`
}

type StockCheckItem struct {
	Id                       int64
	StockCheckId             int64
	MaterialId               int64
	CurrentStock             int
	MaterialName             string
	PriceSnapshot            float32
	PurchaseUnitSnapshot     string
	PurchaseUnitSizeSnapshot float32
	MinimumStockSnapshot     int
	NormalStockSnapshot      int
	CreatedAt                time.Time
}
