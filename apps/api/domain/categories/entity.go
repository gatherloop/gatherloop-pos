package categories

import "time"

type Category struct {
	Id        int64      `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

type CategoryRequest struct {
	Name string `json:"name"`
}
