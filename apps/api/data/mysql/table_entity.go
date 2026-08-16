package mysql

import "time"

type Table struct {
	Id        int64
	Code      string
	Label     string
	CreatedAt time.Time
	DeletedAt *time.Time
}
