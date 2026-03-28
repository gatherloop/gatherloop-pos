package seeds

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// TransactionSeeder seeds sample transactions with items and applied coupons.
type TransactionSeeder struct{}

func (TransactionSeeder) Name() string { return "TransactionSeeder" }

func (TransactionSeeder) Seed(tx *gorm.DB) error {
	type Wallet struct {
		Id   int64
		Name string
	}
	type Variant struct {
		Id    int64
		Name  string
		Price float32
	}
	type Coupon struct {
		Id     int64
		Code   string
		Type   string
		Amount int64
	}
	type Transaction struct {
		Id          int64
		CreatedAt   time.Time
		Name        string
		OrderNumber int64
		WalletId    *int64
		Total       float32
		TotalIncome float32
		PaidAmount  float32
		PaidAt      *time.Time
		DeletedAt   *time.Time
	}
	type TransactionItem struct {
		Id             int64
		TransactionId  int64
		VariantId      int64
		Amount         float32
		Price          float32
		DiscountAmount float32
		Subtotal       float32
		Note           string
	}
	type TransactionCoupon struct {
		Id            int64
		TransactionId int64
		CouponId      int64
		Type          string
		Amount        int64
	}

	getWalletId := func(name string) (int64, error) {
		var w Wallet
		if err := tx.Table("wallets").Where("name = ?", name).First(&w).Error; err != nil {
			return 0, fmt.Errorf("wallet %q not found: %w", name, err)
		}
		return w.Id, nil
	}

	getVariant := func(name string) (Variant, error) {
		var v Variant
		if err := tx.Table("variants").Where("name = ?", name).First(&v).Error; err != nil {
			return v, fmt.Errorf("variant %q not found: %w", name, err)
		}
		return v, nil
	}

	getCoupon := func(code string) (Coupon, error) {
		var c Coupon
		if err := tx.Table("coupons").Where("code = ?", code).First(&c).Error; err != nil {
			return c, fmt.Errorf("coupon %q not found: %w", code, err)
		}
		return c, nil
	}

	now := time.Now()
	paidAt := now.Add(-1 * time.Hour)

	type itemDef struct {
		VariantName string
		Amount      float32
		Note        string
	}
	type couponDef struct {
		Code string
	}
	type txDef struct {
		OrderNumber int64
		Name        string
		WalletName  string
		Paid        bool
		Items       []itemDef
		Coupons     []couponDef
	}

	transactions := []txDef{
		{
			OrderNumber: 1,
			Name:        "Order #1",
			WalletName:  "Cash",
			Paid:        true,
			Items: []itemDef{
				{VariantName: "Espresso Small", Amount: 2},
				{VariantName: "Cappuccino Medium", Amount: 1},
			},
			Coupons: nil,
		},
		{
			OrderNumber: 2,
			Name:        "Order #2",
			WalletName:  "GoPay",
			Paid:        true,
			Items: []itemDef{
				{VariantName: "Matcha Latte Medium", Amount: 1},
				{VariantName: "Chocolate Cake Slice", Amount: 2},
			},
			Coupons: []couponDef{{"DISC10"}},
		},
		{
			OrderNumber: 3,
			Name:        "Order #3",
			WalletName:  "Cash",
			Paid:        true,
			Items: []itemDef{
				{VariantName: "Chicken Sandwich Mild", Amount: 1},
				{VariantName: "Mineral Water 600ml", Amount: 2},
			},
			Coupons: []couponDef{{"FLAT5K"}},
		},
		{
			OrderNumber: 4,
			Name:        "Order #4",
			WalletName:  "Cash",
			Paid:        false, // unpaid / still open
			Items: []itemDef{
				{VariantName: "Cappuccino Large", Amount: 2},
				{VariantName: "Chocolate Cake Whole", Amount: 1},
			},
			Coupons: nil,
		},
	}

	for _, td := range transactions {
		var count int64
		if err := tx.Table("transactions").Where("order_number = ?", td.OrderNumber).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		walletId, err := getWalletId(td.WalletName)
		if err != nil {
			return err
		}

		// Build items and calculate totals.
		type resolvedItem struct {
			variant  Variant
			amount   float32
			subtotal float32
			note     string
		}

		var resolvedItems []resolvedItem
		var total float32

		for _, id := range td.Items {
			v, err := getVariant(id.VariantName)
			if err != nil {
				return err
			}
			subtotal := v.Price * id.Amount
			total += subtotal
			resolvedItems = append(resolvedItems, resolvedItem{
				variant:  v,
				amount:   id.Amount,
				subtotal: subtotal,
				note:     id.Note,
			})
		}

		// Apply coupon discounts.
		var couponDiscount float32
		for _, cd := range td.Coupons {
			c, err := getCoupon(cd.Code)
			if err != nil {
				return err
			}
			switch c.Type {
			case "percentage":
				couponDiscount += total * float32(c.Amount) / 100
			case "fixed":
				couponDiscount += float32(c.Amount)
			}
		}

		totalIncome := total - couponDiscount

		var paidAtPtr *time.Time
		paidAmount := float32(0)
		if td.Paid {
			paidAtPtr = &paidAt
			paidAmount = totalIncome
		}

		transaction := Transaction{
			CreatedAt:   now,
			Name:        td.Name,
			OrderNumber: td.OrderNumber,
			WalletId:    &walletId,
			Total:       total,
			TotalIncome: totalIncome,
			PaidAmount:  paidAmount,
			PaidAt:      paidAtPtr,
		}
		if err := tx.Table("transactions").Create(&transaction).Error; err != nil {
			return err
		}

		for _, ri := range resolvedItems {
			item := TransactionItem{
				TransactionId:  transaction.Id,
				VariantId:      ri.variant.Id,
				Amount:         ri.amount,
				Price:          ri.variant.Price,
				DiscountAmount: 0,
				Subtotal:       ri.subtotal,
				Note:           ri.note,
			}
			if err := tx.Table("transaction_items").Create(&item).Error; err != nil {
				return err
			}
		}

		for _, cd := range td.Coupons {
			c, err := getCoupon(cd.Code)
			if err != nil {
				return err
			}
			tc := TransactionCoupon{
				TransactionId: transaction.Id,
				CouponId:      c.Id,
				Type:          c.Type,
				Amount:        c.Amount,
			}
			if err := tx.Table("transaction_coupons").Create(&tc).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
