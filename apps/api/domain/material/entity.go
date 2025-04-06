package material

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
