package category

import "time"

type Category struct {
	Id        int64
	Name      string
	CreatedAt time.Time
	DeletedAt *time.Time
}

type CategoryRequest struct {
	Name string
}
