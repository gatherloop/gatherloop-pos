package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewAuthRepository(db *gorm.DB) domain.AuthRepository {
	return Repository{db: db}
}

func (repo Repository) GetUserByUsername(ctx context.Context, username string) (domain.User, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var user domain.User
	result := db.Table("users").Where("username = ?", username).First(&user)
	return user, ToError(result.Error)
}
