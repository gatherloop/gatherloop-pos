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

type ProductRequest struct {
	CategoryId  int64                    `json:"categoryId"`
	Name        string                   `json:"name"`
	Price       float32                  `json:"price"`
	Description *string                  `json:"description"`
	Materials   []ProductMaterialRequest `json:"materials"`
	Variants    []ProductVariantRequest  `json:"variants"`
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

type ProductMaterialRequest struct {
	Id         *int64  `json:"id"`
	MaterialId int64   `json:"materialId"`
	Amount     float32 `json:"amount"`
}

type ProductVariant struct {
	Id        int64                  `json:"id"`
	Name      string                 `json:"name"`
	Options   []ProductVariantOption `json:"options"`
	ProductId int64                  `json:"productId"`
}

type ProductVariantRequest struct {
	Id      *int64                        `json:"id"`
	Name    string                        `json:"name"`
	Options []ProductVariantOptionRequest `json:"options"`
}

type ProductVariantOption struct {
	Id               int64  `json:"id"`
	Name             string `json:"name"`
	ProductVariantId int64  `json:"productVariantId"`
}

type ProductVariantOptionRequest struct {
	Id   *int64 `json:"id"`
	Name string `json:"name"`
}
