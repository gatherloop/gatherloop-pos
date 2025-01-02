package budget

import "time"

type Budget struct {
	Id         int64      `json:"id"`
	Name       string     `json:"name"`
	Percentage float32    `json:"percentage"`
	Balance    float32    `json:"balance"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type BudgetRequest struct {
	Name       string  `json:"name"`
	Percentage float32 `json:"percentage"`
	Balance    float32 `json:"balance"`
}
