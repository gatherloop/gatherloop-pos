package authentications_mysql

import (
	"apps/api/domain/authentications"
	"apps/api/utils"
	"context"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) authentications.Repository {
	return Repository{db: db}
}

func (repo Repository) GetUserByUsername(ctx context.Context, username string) (authentications.User, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var user authentications.User
	result := db.Table("users").Where("username = ?", username).First(&user)
	return user, result.Error
}
