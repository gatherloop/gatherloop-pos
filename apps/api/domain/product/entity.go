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
	ImageUrl    string
	DeletedAt   *time.Time
	CreatedAt   time.Time
	Options     []Option
}

type Option struct {
	Id        int64
	ProductId int64
	Name      string
	Values    []OptionValue
}

type OptionValue struct {
	Id       int64
	OptionId int64
	Name     string
}
