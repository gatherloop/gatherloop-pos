package domain

import (
	"context"
)

type AuthRepository interface {
	GetUserByUsername(ctx context.Context, username string) (User, *Error)
}
