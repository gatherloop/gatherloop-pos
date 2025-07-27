package variant

import (
	"apps/api/domain/category"
	"apps/api/domain/material"
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
	CategoryId  int64
	Name        string
	Price       float32
	Description *string
	Category    category.Category
	Materials   []VariantMaterial
	DeletedAt   *time.Time
	CreatedAt   time.Time
}
