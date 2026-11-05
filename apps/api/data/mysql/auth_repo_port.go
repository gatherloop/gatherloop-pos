package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewAuthRepoPort(db *gorm.DB) domain.AuthRepoPort {
	return Repository{db: db}
}

func (repo Repository) GetUserByUsername(ctx context.Context, username string) (domain.User, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var user User
	result := db.Table("users").Where("username = ?", username).First(&user)
	return ToUserDomain(user), ToErrorCtx(ctx, result.Error, "GetUserByUsername")
}
