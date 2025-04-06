package auth

import "time"

type User struct {
	Id        int64
	Username  string
	Password  string
	CreatedAt time.Time
	DeletedAt *time.Time
}

type LoginRequest struct {
	Username string
	Password string
}
