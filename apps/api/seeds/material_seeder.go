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
		Id                   int64
		Name                 string
		Price                float32
		Unit                 string
		Description          *string
		PurchaseUnit         string
		PurchaseUnitSize     float32
		MinimumStock         int
		NormalStock          int
		IsStockCheckRequired bool
		CreatedAt            time.Time
		DeletedAt            *time.Time
	}

	desc := func(s string) *string { return &s }

	materials := []Material{
		{Name: "Coffee Beans", Price: 150, Unit: "gram", Description: desc("Arabica coffee beans"), PurchaseUnit: "Kg", PurchaseUnitSize: 1000, MinimumStock: 2, NormalStock: 5, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Milk", Price: 18, Unit: "ml", Description: desc("Fresh full-cream milk"), PurchaseUnit: "Liter", PurchaseUnitSize: 1000, MinimumStock: 5, NormalStock: 15, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Sugar", Price: 14, Unit: "gram", Description: desc("Refined white sugar"), PurchaseUnit: "Kg", PurchaseUnitSize: 1000, MinimumStock: 2, NormalStock: 5, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Cup (12oz)", Price: 500, Unit: "pcs", Description: desc("Disposable paper cup"), PurchaseUnit: "Pack", PurchaseUnitSize: 50, MinimumStock: 1, NormalStock: 4, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Cup Lid", Price: 200, Unit: "pcs", Description: desc("Plastic lid for 12oz cup"), PurchaseUnit: "Pack", PurchaseUnitSize: 50, MinimumStock: 1, NormalStock: 4, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Chocolate Powder", Price: 90, Unit: "gram", Description: desc("Dark cocoa powder"), PurchaseUnit: "Kg", PurchaseUnitSize: 1000, MinimumStock: 1, NormalStock: 3, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Matcha Powder", Price: 200, Unit: "gram", Description: desc("Premium Japanese matcha"), PurchaseUnit: "Kg", PurchaseUnitSize: 1000, MinimumStock: 1, NormalStock: 3, IsStockCheckRequired: true, CreatedAt: time.Now()},
		{Name: "Mineral Water", Price: 3000, Unit: "bottle", Description: desc("600ml mineral water"), PurchaseUnit: "Box", PurchaseUnitSize: 24, MinimumStock: 1, NormalStock: 3, IsStockCheckRequired: true, CreatedAt: time.Now()},
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
