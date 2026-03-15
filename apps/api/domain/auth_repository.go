//go:generate mockgen -source=auth_repository.go -destination=../data/mock/auth_repository.go -package=mock

package domain

import (
	"context"
)

type AuthRepository interface {
	GetUserByUsername(ctx context.Context, username string) (User, *Error)
}
