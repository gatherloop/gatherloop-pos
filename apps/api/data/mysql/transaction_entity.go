package mysql

import "time"

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
}

type TransactionCoupon struct {
	Id            int64
	TransactionId int64
	CouponId      int64
	Coupon        Coupon
	Type          string
	Amount        int64
}

type Transaction struct {
	Id                 int64
	CreatedAt          time.Time
	Name               string
	OrderNumber        int64
	WalletId           *int64
	Wallet             *Wallet
	Total              float32
	TotalIncome        float32
	TransactionItems   []TransactionItem
	TransactionCoupons []TransactionCoupon
	PaidAmount         float32
	PaidAt             *time.Time
	DeletedAt          *time.Time
}

type TransactionStatistic struct {
	Date        string
	Total       int32
	TotalIncome float32
}
