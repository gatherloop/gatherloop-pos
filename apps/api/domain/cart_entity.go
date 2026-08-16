package domain

import "time"

type CartStatus string

const (
	CartStatusActive    CartStatus = "active"
	CartStatusConverted CartStatus = "converted"
	CartStatusAbandoned CartStatus = "abandoned"
)

type CartItem struct {
	Id        int64
	CartId    int64
	VariantId int64
	Variant   Variant
	Amount    float32
	Note      string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

type Cart struct {
	Id        int64
	SessionId string
	TableId   *int64
	Table     *Table
	Status    CartStatus
	Items     []CartItem
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}
