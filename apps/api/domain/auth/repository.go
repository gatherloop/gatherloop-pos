package auth

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	GetUserByUsername(ctx context.Context, username string) (User, *base.Error)
}
