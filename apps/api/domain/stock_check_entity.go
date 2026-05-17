package domain

import "time"

type StockCheck struct {
	Id        int64
	CreatedAt time.Time
	DeletedAt *time.Time
	Items     []StockCheckItem
}

type StockCheckItem struct {
	Id               int64
	StockCheckId     int64
	MaterialId       int64
	CurrentStock     int64
	MaterialName     string
	Price            float32
	PurchaseUnit     string
	PurchaseUnitSize float32
	MinimumStock     int64
	NormalStock      int64
	CreatedAt        time.Time
}

type StockCheckItemRequest struct {
	MaterialId   int64
	CurrentStock int64
}

type PurchaseList struct {
	StockCheckId       int64
	StockCheckDate     string
	TotalEstimatedCost float32
	Items              []PurchaseListItem
}

type PurchaseListItem struct {
	MaterialId       int64
	MaterialName     string
	CurrentStock     int64
	MinimumStock     int64
	NormalStock      int64
	PurchaseUnit     string
	PurchaseUnitSize float32
	PurchaseQuantity int64
	EstimatedCost    float32
}
