package authentications

import "time"

type User struct {
	Id        int64      `json:"id"`
	Username  string     `json:"username"`
	Password  string     `json:"password"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
