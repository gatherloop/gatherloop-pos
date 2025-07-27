package variant

import (
	"apps/api/domain/material"
	"apps/api/domain/product"
	"time"
)

type VariantMaterial struct {
	Id         int64
	VariantId  int64
	MaterialId int64
	Material   material.Material
	Amount     float32
	DeletedAt  *time.Time
	CreatedAt  time.Time
}

type Variant struct {
	Id          int64
	ProductId   int64
	Product     product.Product
	Name        string
	Price       float32
	Description *string
	Materials   []VariantMaterial
	DeletedAt   *time.Time
	CreatedAt   time.Time
}
