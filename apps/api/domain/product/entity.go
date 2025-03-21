package product

import (
	"apps/api/domain/category"
	"apps/api/domain/material"
	"time"
)

type Product struct {
	Id          int64             `json:"id"`
	CategoryId  int64             `json:"categoryId"`
	Name        string            `json:"name"`
	Price       float32           `json:"price"`
	Description *string           `json:"description"`
	Category    category.Category `json:"category"`
	Materials   []ProductMaterial `json:"materials"`
	Variants    []ProductVariant  `json:"variants"`
	DeletedAt   *time.Time        `json:"deletedAt,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
}

type ProductMaterial struct {
	Id         int64             `json:"id"`
	ProductId  int64             `json:"productId"`
	MaterialId int64             `json:"materialId"`
	Material   material.Material `json:"material"`
	Amount     float32           `json:"amount"`
	DeletedAt  *time.Time        `json:"deletedAt,omitempty"`
	CreatedAt  time.Time         `json:"createdAt"`
}

type ProductVariant struct {
	Id        int64                  `json:"id"`
	Name      string                 `json:"name"`
	Options   []ProductVariantOption `json:"options"`
	ProductId int64                  `json:"productId"`
}

type ProductVariantOption struct {
	Id               int64  `json:"id"`
	Name             string `json:"name"`
	ProductVariantId int64  `json:"productVariantId"`
}
