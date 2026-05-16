package mysql

import "time"

type Supplier struct {
	Id        int64
	Name      string
	Phone     *string
	Address   string
	MapsLink  string
	IsOnline  bool
	DeletedAt *time.Time
	CreatedAt time.Time
}
