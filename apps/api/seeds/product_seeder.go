package seeds

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ProductSeeder seeds sample products together with their options and option values.
type ProductSeeder struct{}

func (ProductSeeder) Name() string { return "ProductSeeder" }

func (ProductSeeder) Seed(tx *gorm.DB) error {
	type Category struct {
		Id   int64
		Name string
	}
	type Product struct {
		Id          int64
		CategoryId  int64
		Name        string
		Description *string
		ImageUrl    string
		SaleType    string
		CreatedAt   time.Time
		DeletedAt   *time.Time
	}
	type Option struct {
		Id        int64
		ProductId int64
		Name      string
	}
	type OptionValue struct {
		Id       int64
		OptionId int64
		Name     string
	}

	getCategoryId := func(name string) (int64, error) {
		var cat Category
		if err := tx.Table("categories").Where("name = ?", name).First(&cat).Error; err != nil {
			return 0, fmt.Errorf("category %q not found: %w", name, err)
		}
		return cat.Id, nil
	}

	desc := func(s string) *string { return &s }

	type productDef struct {
		Name        string
		Category    string
		Description string
		SaleType    string
		// ordered slice of [option name, value1, value2, ...]
		Options [][]string
	}

	products := []productDef{
		{
			Name:        "Espresso",
			Category:    "Beverages",
			Description: "Rich and bold espresso shot",
			SaleType:    "purchase",
			Options:     [][]string{{"Size", "Small", "Medium", "Large"}},
		},
		{
			Name:        "Cappuccino",
			Category:    "Beverages",
			Description: "Espresso with steamed milk foam",
			SaleType:    "purchase",
			Options:     [][]string{{"Size", "Small", "Medium", "Large"}},
		},
		{
			Name:        "Matcha Latte",
			Category:    "Beverages",
			Description: "Premium matcha with steamed milk",
			SaleType:    "purchase",
			Options:     [][]string{{"Size", "Small", "Medium", "Large"}},
		},
		{
			Name:        "Chocolate Cake",
			Category:    "Desserts",
			Description: "Moist chocolate layer cake",
			SaleType:    "purchase",
			Options:     [][]string{{"Serving", "Slice", "Whole"}},
		},
		{
			Name:        "Chicken Sandwich",
			Category:    "Food",
			Description: "Grilled chicken in a soft bun",
			SaleType:    "purchase",
			Options:     [][]string{{"Spicy Level", "Mild", "Spicy", "Extra Spicy"}},
		},
		{
			Name:        "Mineral Water",
			Category:    "Beverages",
			Description: "600ml bottled mineral water",
			SaleType:    "purchase",
			Options:     nil,
		},
	}

	for _, pd := range products {
		var count int64
		if err := tx.Table("products").Where("name = ?", pd.Name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		catId, err := getCategoryId(pd.Category)
		if err != nil {
			return err
		}

		product := Product{
			CategoryId:  catId,
			Name:        pd.Name,
			Description: desc(pd.Description),
			ImageUrl:    "",
			SaleType:    pd.SaleType,
			CreatedAt:   time.Now(),
		}
		if err := tx.Table("products").Create(&product).Error; err != nil {
			return err
		}

		for _, optDef := range pd.Options {
			if len(optDef) < 2 {
				continue
			}
			option := Option{
				ProductId: product.Id,
				Name:      optDef[0],
			}
			if err := tx.Table("options").Create(&option).Error; err != nil {
				return err
			}

			for _, valName := range optDef[1:] {
				ov := OptionValue{
					OptionId: option.Id,
					Name:     valName,
				}
				if err := tx.Table("option_values").Create(&ov).Error; err != nil {
					return err
				}
			}
		}
	}

	return nil
}
