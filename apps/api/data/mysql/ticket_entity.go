package mysql

import "time"

type Ticket struct {
	Id        int64
	Code      string
	Name      string
	CreatedAt time.Time
	DeletedAt *time.Time
}
