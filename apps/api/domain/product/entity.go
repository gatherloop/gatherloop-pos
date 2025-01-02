package product

import (
	"apps/api/domain/category"
	"apps/api/domain/material"
	"time"
)

type ProductMaterial struct {
	Id         int64             `json:"id"`
	ProductId  int64             `json:"productId"`
	MaterialId int64             `json:"materialId"`
	Material   material.Material `json:"material"`
	Amount     float32           `json:"amount"`
	DeletedAt  *time.Time        `json:"deletedAt,omitempty"`
	CreatedAt  time.Time         `json:"createdAt"`
}

type Product struct {
	Id          int64             `json:"id"`
	CategoryId  int64             `json:"categoryId"`
	Name        string            `json:"name"`
	Price       float32           `json:"price"`
	Description *string           `json:"description"`
	Category    category.Category `json:"category"`
	Materials   []ProductMaterial `json:"materials"`
	DeletedAt   *time.Time        `json:"deletedAt,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
}

type ProductMaterialRequest struct {
	MaterialId int64   `json:"materialId"`
	Amount     float32 `json:"amount"`
}

type ProductRequest struct {
	CategoryId  int64                    `json:"categoryId"`
	Name        string                   `json:"name"`
	Price       float32                  `json:"price"`
	Description *string                  `json:"description"`
	Materials   []ProductMaterialRequest `json:"materials"`
}
