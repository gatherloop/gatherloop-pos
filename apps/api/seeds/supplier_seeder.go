package seeds

import (
	"time"

	"gorm.io/gorm"
)

// SupplierSeeder seeds sample suppliers.
type SupplierSeeder struct{}

func (SupplierSeeder) Name() string { return "SupplierSeeder" }

func (SupplierSeeder) Seed(tx *gorm.DB) error {
	type Supplier struct {
		Id        int64
		Name      string
		Phone     *string
		Address   string
		MapsLink  string
		CreatedAt time.Time
		DeletedAt *time.Time
	}

	phone := func(s string) *string { return &s }

	suppliers := []Supplier{
		{
			Name:      "Fresh Dairy Co.",
			Phone:     phone("+62-21-5550001"),
			Address:   "Jl. Raya Bogor No. 45, Jakarta",
			MapsLink:  "https://maps.google.com/?q=Fresh+Dairy+Co",
			CreatedAt: time.Now(),
		},
		{
			Name:      "Nusantara Coffee Roasters",
			Phone:     phone("+62-21-5550002"),
			Address:   "Jl. Kemang Raya No. 12, Jakarta Selatan",
			MapsLink:  "https://maps.google.com/?q=Nusantara+Coffee+Roasters",
			CreatedAt: time.Now(),
		},
		{
			Name:      "Packaging World",
			Phone:     phone("+62-21-5550003"),
			Address:   "Kawasan Industri Pulo Gadung, Jakarta Timur",
			MapsLink:  "https://maps.google.com/?q=Packaging+World",
			CreatedAt: time.Now(),
		},
	}

	for i := range suppliers {
		var count int64
		if err := tx.Table("suppliers").Where("name = ?", suppliers[i].Name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("suppliers").Create(&suppliers[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
