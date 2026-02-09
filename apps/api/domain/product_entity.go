package domain

import (
	"time"
)

type SaleType string

const (
	SaleTypePurchase SaleType = "purchase"
	SaleTypeRental   SaleType = "rental"
)

type Product struct {
	Id          int64
	CategoryId  int64
	Name        string
	Description *string
	Category    Category
	ImageUrl    string
	DeletedAt   *time.Time
	CreatedAt   time.Time
	Options     []Option
	SaleType    SaleType
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
