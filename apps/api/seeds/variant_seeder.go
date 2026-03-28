package seeds

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// VariantSeeder seeds variants for each product together with their
// material requirements and option-value links.
type VariantSeeder struct{}

func (VariantSeeder) Name() string { return "VariantSeeder" }

func (VariantSeeder) Seed(tx *gorm.DB) error {
	type Product struct {
		Id   int64
		Name string
	}
	type Material struct {
		Id   int64
		Name string
	}
	type OptionValue struct {
		Id   int64
		Name string
	}
	type Variant struct {
		Id          int64
		ProductId   int64
		Name        string
		Price       float32
		Description *string
		CreatedAt   time.Time
		DeletedAt   *time.Time
	}
	type VariantMaterial struct {
		Id         int64
		VariantId  int64
		MaterialId int64
		Amount     float32
		CreatedAt  time.Time
		DeletedAt  *time.Time
	}
	type VariantValue struct {
		Id            int64
		VariantId     int64
		OptionValueId int64
	}

	getProductId := func(name string) (int64, error) {
		var p Product
		if err := tx.Table("products").Where("name = ?", name).First(&p).Error; err != nil {
			return 0, fmt.Errorf("product %q not found: %w", name, err)
		}
		return p.Id, nil
	}

	getMaterialId := func(name string) (int64, error) {
		var m Material
		if err := tx.Table("materials").Where("name = ?", name).First(&m).Error; err != nil {
			return 0, fmt.Errorf("material %q not found: %w", name, err)
		}
		return m.Id, nil
	}

	// getOptionValueId finds the ID of an option value belonging to a given product.
	getOptionValueId := func(productId int64, optionName, valueName string) (int64, error) {
		var ov OptionValue
		err := tx.Table("option_values").
			Joins("JOIN options ON options.id = option_values.option_id").
			Where("options.product_id = ? AND options.name = ? AND option_values.name = ?", productId, optionName, valueName).
			First(&ov).Error
		if err != nil {
			return 0, fmt.Errorf("option value %q/%q for product %d not found: %w", optionName, valueName, productId, err)
		}
		return ov.Id, nil
	}

	desc := func(s string) *string { return &s }

	// variantDef describes a single variant to seed.
	type materialUsage struct {
		Name   string
		Amount float32
	}
	type variantDef struct {
		ProductName string
		Name        string
		Price       float32
		Description string
		// option name -> option value name (can be empty for products with no options)
		OptionValues map[string]string
		Materials    []materialUsage
	}

	variants := []variantDef{
		// ── Espresso ──────────────────────────────────────────────────────────
		{
			ProductName: "Espresso", Name: "Espresso Small", Price: 15000,
			Description:  "Small espresso shot",
			OptionValues: map[string]string{"Size": "Small"},
			Materials:    []materialUsage{{"Coffee Beans", 0.005}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		{
			ProductName: "Espresso", Name: "Espresso Medium", Price: 20000,
			Description:  "Medium espresso shot",
			OptionValues: map[string]string{"Size": "Medium"},
			Materials:    []materialUsage{{"Coffee Beans", 0.007}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		{
			ProductName: "Espresso", Name: "Espresso Large", Price: 25000,
			Description:  "Large espresso shot",
			OptionValues: map[string]string{"Size": "Large"},
			Materials:    []materialUsage{{"Coffee Beans", 0.010}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		// ── Cappuccino ────────────────────────────────────────────────────────
		{
			ProductName: "Cappuccino", Name: "Cappuccino Small", Price: 22000,
			Description:  "Small cappuccino",
			OptionValues: map[string]string{"Size": "Small"},
			Materials:    []materialUsage{{"Coffee Beans", 0.005}, {"Milk", 0.10}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		{
			ProductName: "Cappuccino", Name: "Cappuccino Medium", Price: 28000,
			Description:  "Medium cappuccino",
			OptionValues: map[string]string{"Size": "Medium"},
			Materials:    []materialUsage{{"Coffee Beans", 0.007}, {"Milk", 0.15}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		{
			ProductName: "Cappuccino", Name: "Cappuccino Large", Price: 34000,
			Description:  "Large cappuccino",
			OptionValues: map[string]string{"Size": "Large"},
			Materials:    []materialUsage{{"Coffee Beans", 0.010}, {"Milk", 0.20}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		// ── Matcha Latte ──────────────────────────────────────────────────────
		{
			ProductName: "Matcha Latte", Name: "Matcha Latte Small", Price: 25000,
			Description:  "Small matcha latte",
			OptionValues: map[string]string{"Size": "Small"},
			Materials:    []materialUsage{{"Matcha Powder", 0.010}, {"Milk", 0.10}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		{
			ProductName: "Matcha Latte", Name: "Matcha Latte Medium", Price: 32000,
			Description:  "Medium matcha latte",
			OptionValues: map[string]string{"Size": "Medium"},
			Materials:    []materialUsage{{"Matcha Powder", 0.015}, {"Milk", 0.15}, {"Cup (12oz)", 1}, {"Cup Lid", 1}},
		},
		// ── Chocolate Cake ────────────────────────────────────────────────────
		{
			ProductName: "Chocolate Cake", Name: "Chocolate Cake Slice", Price: 18000,
			Description:  "One slice of chocolate cake",
			OptionValues: map[string]string{"Serving": "Slice"},
			Materials:    []materialUsage{{"Chocolate Powder", 0.05}, {"Sugar", 0.05}},
		},
		{
			ProductName: "Chocolate Cake", Name: "Chocolate Cake Whole", Price: 120000,
			Description:  "Whole chocolate cake",
			OptionValues: map[string]string{"Serving": "Whole"},
			Materials:    []materialUsage{{"Chocolate Powder", 0.30}, {"Sugar", 0.30}},
		},
		// ── Chicken Sandwich ──────────────────────────────────────────────────
		{
			ProductName: "Chicken Sandwich", Name: "Chicken Sandwich Mild", Price: 28000,
			Description:  "Mild grilled chicken sandwich",
			OptionValues: map[string]string{"Spicy Level": "Mild"},
			Materials:    nil,
		},
		{
			ProductName: "Chicken Sandwich", Name: "Chicken Sandwich Spicy", Price: 28000,
			Description:  "Spicy grilled chicken sandwich",
			OptionValues: map[string]string{"Spicy Level": "Spicy"},
			Materials:    nil,
		},
		// ── Mineral Water ─────────────────────────────────────────────────────
		{
			ProductName: "Mineral Water", Name: "Mineral Water 600ml", Price: 5000,
			Description:  "600ml mineral water bottle",
			OptionValues: nil,
			Materials:    []materialUsage{{"Mineral Water", 1}},
		},
	}

	for _, vd := range variants {
		productId, err := getProductId(vd.ProductName)
		if err != nil {
			return err
		}

		var count int64
		if err := tx.Table("variants").
			Where("product_id = ? AND name = ?", productId, vd.Name).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		variant := Variant{
			ProductId:   productId,
			Name:        vd.Name,
			Price:       vd.Price,
			Description: desc(vd.Description),
			CreatedAt:   time.Now(),
		}
		if err := tx.Table("variants").Create(&variant).Error; err != nil {
			return err
		}

		// seed variant materials
		for _, mu := range vd.Materials {
			matId, err := getMaterialId(mu.Name)
			if err != nil {
				return err
			}
			vm := VariantMaterial{
				VariantId:  variant.Id,
				MaterialId: matId,
				Amount:     mu.Amount,
				CreatedAt:  time.Now(),
			}
			if err := tx.Table("variant_materials").Create(&vm).Error; err != nil {
				return err
			}
		}

		// seed variant values (option value links)
		for optName, valName := range vd.OptionValues {
			ovId, err := getOptionValueId(productId, optName, valName)
			if err != nil {
				return err
			}
			vv := VariantValue{
				VariantId:     variant.Id,
				OptionValueId: ovId,
			}
			if err := tx.Table("variant_values").Create(&vv).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
