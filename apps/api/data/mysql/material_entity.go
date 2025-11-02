package mysql

import "time"

type Material struct {
	Id          int64
	Name        string
	Price       float32
	Unit        string
	Description *string
	DeletedAt   *time.Time
	CreatedAt   time.Time
}

type MaterialUsage struct {
	ID     int64   `gorm:"column:id"`
	Amount float32 `gorm:"column:amount"`
}
