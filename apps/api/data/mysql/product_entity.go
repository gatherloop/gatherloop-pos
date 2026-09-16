package mysql

import "time"

type Product struct {
	Id                   int64
	CategoryId           int64
	Name                 string
	Description          *string
	Recipe               *string
	Category             Category
	ImageUrl             string
	DeletedAt            *time.Time
	CreatedAt            time.Time
	Options              []Option
	SaleType             string
	Status               string
	IsAvailable          bool   `gorm:"default:1"`
	AvailabilityTracking string `gorm:"default:none"`
	AvailableQuantity    *int
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
