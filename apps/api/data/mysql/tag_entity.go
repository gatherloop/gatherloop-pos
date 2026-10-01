package mysql

import "time"

type Tag struct {
	Id            int64
	Name          string
	Color         string
	IsHighlighted bool
	SortOrder     int
	CreatedAt     time.Time
}
