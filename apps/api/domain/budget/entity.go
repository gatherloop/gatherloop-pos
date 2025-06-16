package budget

import "time"

type Budget struct {
	Id         int64
	Name       string
	Percentage float32
	Balance    float32
	DeletedAt  *time.Time
	CreatedAt  time.Time
}
