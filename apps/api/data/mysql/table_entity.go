package mysql

import "time"

type Table struct {
	Id          int64
	Code        string
	Label       string
	FloorNumber int
	CreatedAt   time.Time
	DeletedAt   *time.Time
}
