package domain

import (
	"time"
)

type VariantMaterial struct {
	Id         int64
	VariantId  int64
	MaterialId int64
	Material   Material
	Amount     float32
	DeletedAt  *time.Time
	CreatedAt  time.Time
}

type VariantValue struct {
	Id            int64
	VariantId     int64
	OptionValueId int64
	OptionValue   OptionValue
}

type Variant struct {
	Id            int64
	ProductId     int64
	Product       Product
	Name          string
	Price         float32
	Description   *string
	Materials     []VariantMaterial
	DeletedAt     *time.Time
	CreatedAt     time.Time
	VariantValues []VariantValue
}
