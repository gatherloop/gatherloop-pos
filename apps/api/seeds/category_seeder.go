package seeds

import (
	"time"

	"gorm.io/gorm"
)

// CategorySeeder seeds sample product categories.
type CategorySeeder struct{}

func (CategorySeeder) Name() string { return "CategorySeeder" }

func (CategorySeeder) Seed(tx *gorm.DB) error {
	type Category struct {
		Id        int64
		Name      string
		CreatedAt time.Time
		DeletedAt *time.Time
	}

	categories := []string{"Beverages", "Food", "Snacks", "Desserts", "Merchandise"}

	for _, name := range categories {
		var count int64
		if err := tx.Table("categories").Where("name = ?", name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("categories").Create(&Category{
			Name:      name,
			CreatedAt: time.Now(),
		}).Error; err != nil {
			return err
		}
	}
	return nil
}
