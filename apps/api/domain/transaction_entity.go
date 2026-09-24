package domain

import (
	"time"
)

type TransactionItem struct {
	Id             int64
	TransactionId  int64
	VariantId      int64
	Variant        Variant
	Amount         float32
	Price          float32
	DiscountAmount float32
	Subtotal       float32
	RentalId       *int64
	Note           string
	ProductName    string
	Values         []TransactionItemValue
}

type TransactionItemValue struct {
	Id                int64
	TransactionItemId int64
	OptionName        string
	OptionValueName   string
}

type TransactionCoupon struct {
	Id                int64
	TransactionId     int64
	CouponId          int64
	Coupon            Coupon
	Type              CouponType
	Amount            int64
	TransactionItemId *int64
}

type TransactionSource string

const (
	TransactionSourcePos   TransactionSource = "pos"
	TransactionSourceOrder TransactionSource = "order"
)

type TransactionFulfillment string

const (
	TransactionFulfillmentPreparing TransactionFulfillment = "preparing"
	TransactionFulfillmentReady     TransactionFulfillment = "ready"
)

type DiningOption string

const (
	DiningOptionDineIn   DiningOption = "dine_in"
	DiningOptionTakeaway DiningOption = "takeaway"
)

// D9: "" is valid — it means "default" on create and "unchanged" on update.
func (o DiningOption) IsValid() bool {
	switch o {
	case "", DiningOptionDineIn, DiningOptionTakeaway:
		return true
	default:
		return false
	}
}

type Transaction struct {
	Id                 int64
	CreatedAt          time.Time
	Name               string
	Source             TransactionSource
	DiningOption       DiningOption
	CartId             *int64
	Cart               *Cart
	PagerNumber        int64
	TransactionNumber  int64
	WalletId           *int64
	Wallet             *Wallet
	Total              float32
	TotalIncome        float32
	TransactionItems   []TransactionItem
	TransactionCoupons []TransactionCoupon
	PaidAmount         float32
	PaidAt             *time.Time
	CompletedAt        *time.Time
	DeletedAt          *time.Time
	PaymentMethod      *PaymentMethod
}

type TransactionStatistic struct {
	Date        string
	Total       float32
	TotalIncome float32
}

type TransactionSummary struct {
	Id                int64
	TransactionNumber int64
	Name              string
	TableLabel        string
	ItemCount         int
	CompletedAt       *time.Time
	DiningOption      DiningOption
}

type PaymentStatus int

const (
	Paid PaymentStatus = iota
	Unpaid
	All
)
