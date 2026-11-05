//go:generate mockgen -source=auth_port.go -destination=../data/mock/auth_port.go -package=mock

package domain

import (
	"context"
)

type AuthRepoPort interface {
	GetUserByUsername(ctx context.Context, username string) (User, *Error)
}
