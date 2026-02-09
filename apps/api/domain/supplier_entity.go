package domain

import "time"

type Supplier struct {
	Id        int64
	Name      string
	Phone     *string
	Address   string
	MapsLink  string
	DeletedAt *time.Time
	CreatedAt time.Time
}
