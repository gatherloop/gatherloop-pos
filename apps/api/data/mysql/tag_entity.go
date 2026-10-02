package mysql

import "time"

type Tag struct {
	Id            int64
	Name          string
	Color         string
	IsHighlighted bool
	SortOrder     int
	VariantCount  int64 `gorm:"->"`
	CreatedAt     time.Time
}

type VariantTag struct {
	VariantId int64 `gorm:"primaryKey"`
	TagId     int64 `gorm:"primaryKey"`
	Tag       Tag
	CreatedAt time.Time
}
