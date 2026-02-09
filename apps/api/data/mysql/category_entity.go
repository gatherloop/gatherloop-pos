package mysql

import "time"

type Category struct {
	Id        int64
	Name      string
	CreatedAt time.Time
	DeletedAt *time.Time
}
