package product

import (
	"apps/api/domain/category"
	"apps/api/domain/material"
	"time"
)

type ProductMaterial struct {
	Id         int64
	ProductId  int64
	MaterialId int64
	Material   material.Material
	Amount     float32
	DeletedAt  *time.Time
	CreatedAt  time.Time
}

type Product struct {
	Id          int64
	CategoryId  int64
	Name        string
	Price       float32
	Description *string
	Category    category.Category
	Materials   []ProductMaterial
	DeletedAt   *time.Time
	CreatedAt   time.Time
}
