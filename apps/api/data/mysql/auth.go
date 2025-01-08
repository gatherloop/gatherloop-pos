package mysql

import (
	"apps/api/domain/auth"
	"apps/api/domain/base"
	"context"

	"gorm.io/gorm"
)

func NewAuthRepository(db *gorm.DB) auth.Repository {
	return Repository{db: db}
}

func (repo Repository) GetUserByUsername(ctx context.Context, username string) (auth.User, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var user auth.User
	result := db.Table("users").Where("username = ?", username).First(&user)
	return user, ToError(result.Error)
}
