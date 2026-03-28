package seeds

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserSeeder seeds the users table with an initial admin account.
type UserSeeder struct{}

func (UserSeeder) Name() string { return "UserSeeder" }

func (UserSeeder) Seed(tx *gorm.DB) error {
	type User struct {
		Id        int64
		Username  string
		Password  string
		CreatedAt time.Time
		DeletedAt *time.Time
	}

	var count int64
	if err := tx.Table("users").Where("username = ?", "admin").Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil // already seeded
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return tx.Table("users").Create(&User{
		Username:  "admin",
		Password:  string(hash),
		CreatedAt: time.Now(),
	}).Error
}
