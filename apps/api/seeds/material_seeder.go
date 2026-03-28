package seeds

import (
	"time"

	"gorm.io/gorm"
)

// MaterialSeeder seeds sample raw materials used in product variants.
type MaterialSeeder struct{}

func (MaterialSeeder) Name() string { return "MaterialSeeder" }

func (MaterialSeeder) Seed(tx *gorm.DB) error {
	type Material struct {
		Id          int64
		Name        string
		Price       float32
		Unit        string
		Description *string
		CreatedAt   time.Time
		DeletedAt   *time.Time
	}

	desc := func(s string) *string { return &s }

	materials := []Material{
		{Name: "Coffee Beans", Price: 150000, Unit: "kg", Description: desc("Arabica coffee beans"), CreatedAt: time.Now()},
		{Name: "Milk", Price: 18000, Unit: "liter", Description: desc("Fresh full-cream milk"), CreatedAt: time.Now()},
		{Name: "Sugar", Price: 14000, Unit: "kg", Description: desc("Refined white sugar"), CreatedAt: time.Now()},
		{Name: "Cup (12oz)", Price: 500, Unit: "pcs", Description: desc("Disposable paper cup"), CreatedAt: time.Now()},
		{Name: "Cup Lid", Price: 200, Unit: "pcs", Description: desc("Plastic lid for 12oz cup"), CreatedAt: time.Now()},
		{Name: "Chocolate Powder", Price: 90000, Unit: "kg", Description: desc("Dark cocoa powder"), CreatedAt: time.Now()},
		{Name: "Matcha Powder", Price: 200000, Unit: "kg", Description: desc("Premium Japanese matcha"), CreatedAt: time.Now()},
		{Name: "Mineral Water", Price: 3000, Unit: "bottle", Description: desc("600ml mineral water"), CreatedAt: time.Now()},
	}

	for i := range materials {
		var count int64
		if err := tx.Table("materials").Where("name = ?", materials[i].Name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("materials").Create(&materials[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
