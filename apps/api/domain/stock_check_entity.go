package domain

import "time"

type StockCheck struct {
	Id        int64
	CheckDate string // YYYY-MM-DD
	Note      *string
	CreatedBy int64
	CreatedAt time.Time
	DeletedAt *time.Time
	Items     []StockCheckItem
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

type StockCheckItemRequest struct {
	MaterialId   int64
	CurrentStock int
}

type PurchaseList struct {
	StockCheckId       int64
	StockCheckDate     string
	TotalEstimatedCost float64
	Items              []PurchaseListItem
}

type PurchaseListItem struct {
	MaterialId       int64
	MaterialName     string
	CurrentStock     int
	MinimumStock     int
	NormalStock      int
	PurchaseUnit     string
	PurchaseUnitSize float32
	PurchaseQuantity int
	EstimatedCost    float64
}
