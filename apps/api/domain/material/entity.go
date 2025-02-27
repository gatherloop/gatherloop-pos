package material

import "time"

type Material struct {
	Id          int64      `json:"id"`
	Name        string     `json:"name"`
	Price       float32    `json:"price"`
	Unit        string     `json:"unit"`
	Description *string    `json:"Description"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type MaterialRequest struct {
	Name        string  `json:"name"`
	Price       float32 `json:"price"`
	Unit        string  `json:"unit"`
	Description *string `json:"Description"`
}
