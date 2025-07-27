package product

import (
	"apps/api/domain/category"
	"time"
)

type Product struct {
	Id          int64
	CategoryId  int64
	Name        string
	Description *string
	Category    category.Category
	DeletedAt   *time.Time
	CreatedAt   time.Time
}
