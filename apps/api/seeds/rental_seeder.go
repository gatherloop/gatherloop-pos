package seeds

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// RentalSeeder seeds sample rentals: one currently active and one already checked out.
type RentalSeeder struct{}

func (RentalSeeder) Name() string { return "RentalSeeder" }

func (RentalSeeder) Seed(tx *gorm.DB) error {
	type Variant struct {
		Id   int64
		Name string
	}
	type Rental struct {
		Id         int64
		Code       string
		Name       string
		VariantId  int64
		CheckinAt  time.Time
		CheckoutAt *time.Time
		CreatedAt  time.Time
		DeletedAt  *time.Time
	}

	getVariantId := func(name string) (int64, error) {
		var v Variant
		if err := tx.Table("variants").Where("name = ?", name).First(&v).Error; err != nil {
			return 0, fmt.Errorf("variant %q not found: %w", name, err)
		}
		return v.Id, nil
	}

	now := time.Now()
	checkedOutAt := now.Add(-2 * time.Hour)

	type rentalDef struct {
		Code        string
		Name        string
		VariantName string
		CheckinAt   time.Time
		CheckoutAt  *time.Time
	}

	rentals := []rentalDef{
		{
			Code:        "RNT-001",
			Name:        "Table 1 Rental",
			VariantName: "Espresso Small",
			CheckinAt:   now.Add(-3 * time.Hour),
			CheckoutAt:  nil, // still active
		},
		{
			Code:        "RNT-002",
			Name:        "Table 2 Rental",
			VariantName: "Cappuccino Medium",
			CheckinAt:   now.Add(-5 * time.Hour),
			CheckoutAt:  &checkedOutAt, // already checked out
		},
	}

	for _, rd := range rentals {
		var count int64
		if err := tx.Table("rentals").Where("code = ?", rd.Code).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		variantId, err := getVariantId(rd.VariantName)
		if err != nil {
			return err
		}

		rental := Rental{
			Code:       rd.Code,
			Name:       rd.Name,
			VariantId:  variantId,
			CheckinAt:  rd.CheckinAt,
			CheckoutAt: rd.CheckoutAt,
			CreatedAt:  now,
		}
		if err := tx.Table("rentals").Create(&rental).Error; err != nil {
			return err
		}
	}

	return nil
}
