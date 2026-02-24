package mysql

import "apps/api/domain"

func ToTransactionDB(domainTransaction domain.Transaction) Transaction {
	var wallet *Wallet
	if domainTransaction.Wallet != nil {
		w := ToWalletDB(*domainTransaction.Wallet)
		wallet = &w
	}

	return Transaction{
		Id:                 domainTransaction.Id,
		Name:               domainTransaction.Name,
		OrderNumber:        domainTransaction.OrderNumber,
		WalletId:           domainTransaction.WalletId,
		Wallet:             wallet,
		Total:              domainTransaction.Total,
		TotalIncome:        domainTransaction.TotalIncome,
		PaidAmount:         domainTransaction.PaidAmount,
		PaidAt:             domainTransaction.PaidAt,
		DeletedAt:          domainTransaction.DeletedAt,
		CreatedAt:          domainTransaction.CreatedAt,
		TransactionItems:   ToTransactionItemsListDB(domainTransaction.TransactionItems),
		TransactionCoupons: ToTransactionCouponsListDB(domainTransaction.TransactionCoupons),
	}
}

func ToTransactionDomain(dbTransaction Transaction) domain.Transaction {
	return domain.Transaction{
		Id:                 dbTransaction.Id,
		Name:               dbTransaction.Name,
		OrderNumber:        dbTransaction.OrderNumber,
		WalletId:           dbTransaction.WalletId,
		Total:              dbTransaction.Total,
		TotalIncome:        dbTransaction.TotalIncome,
		PaidAmount:         dbTransaction.PaidAmount,
		PaidAt:             dbTransaction.PaidAt,
		DeletedAt:          dbTransaction.DeletedAt,
		CreatedAt:          dbTransaction.CreatedAt,
		TransactionItems:   ToTransactionItemsListDomain(dbTransaction.TransactionItems),
		TransactionCoupons: ToTransactionCouponsListDomain(dbTransaction.TransactionCoupons),
	}
}

func ToTransactionsListDomain(dbTransactions []Transaction) []domain.Transaction {
	if dbTransactions == nil {
		return nil
	}

	domainTransactions := []domain.Transaction{}
	for _, dbTran := range dbTransactions {
		domainTransactions = append(domainTransactions, ToTransactionDomain(dbTran))
	}
	return domainTransactions
}

func ToTransactionCouponDomain(dbTransactionCoupon TransactionCoupon) domain.TransactionCoupon {
	return domain.TransactionCoupon{
		Id:            dbTransactionCoupon.Id,
		TransactionId: dbTransactionCoupon.TransactionId,
		CouponId:      dbTransactionCoupon.CouponId,
		Coupon:        ToCouponDomain(dbTransactionCoupon.Coupon),
		Type:          domain.CouponType(dbTransactionCoupon.Type),
		Amount:        dbTransactionCoupon.Amount,
	}
}

func ToTransactionCouponDB(domainTransactionCoupon domain.TransactionCoupon) TransactionCoupon {
	return TransactionCoupon{
		Id:            domainTransactionCoupon.Id,
		TransactionId: domainTransactionCoupon.TransactionId,
		CouponId:      domainTransactionCoupon.CouponId,
		Coupon:        ToCouponDB(domainTransactionCoupon.Coupon),
		Type:          string(domainTransactionCoupon.Type),
		Amount:        domainTransactionCoupon.Amount,
	}
}

func ToTransactionCouponsListDomain(dbTransactionCoupons []TransactionCoupon) []domain.TransactionCoupon {
	if dbTransactionCoupons == nil {
		return nil
	}

	domainTransactionCoupons := []domain.TransactionCoupon{}
	for _, dbTranCoupon := range dbTransactionCoupons {
		domainTransactionCoupons = append(domainTransactionCoupons, ToTransactionCouponDomain(dbTranCoupon))
	}
	return domainTransactionCoupons
}

func ToTransactionCouponsListDB(domainTransactionCoupons []domain.TransactionCoupon) []TransactionCoupon {
	if domainTransactionCoupons == nil {
		return nil
	}

	dbTransactionCoupons := []TransactionCoupon{}
	for _, domainTranCoupon := range domainTransactionCoupons {
		dbTransactionCoupons = append(dbTransactionCoupons, ToTransactionCouponDB(domainTranCoupon))
	}
	return dbTransactionCoupons
}

func ToTransactionItemDomain(dbTransactionItem TransactionItem) domain.TransactionItem {
	return domain.TransactionItem{
		Id:             dbTransactionItem.Id,
		TransactionId:  dbTransactionItem.TransactionId,
		VariantId:      dbTransactionItem.VariantId,
		Variant:        ToVariantDomain(dbTransactionItem.Variant),
		Amount:         dbTransactionItem.Amount,
		Price:          dbTransactionItem.Price,
		DiscountAmount: dbTransactionItem.DiscountAmount,
		Subtotal:       dbTransactionItem.Subtotal,
		RentalId:       dbTransactionItem.RentalId,
		Note:           dbTransactionItem.Note,
	}
}

func ToTransactionItemDB(domainTransactionItem domain.TransactionItem) TransactionItem {
	return TransactionItem{
		Id:             domainTransactionItem.Id,
		TransactionId:  domainTransactionItem.TransactionId,
		VariantId:      domainTransactionItem.VariantId,
		Variant:        ToVariantDB(domainTransactionItem.Variant),
		Amount:         domainTransactionItem.Amount,
		Price:          domainTransactionItem.Price,
		DiscountAmount: domainTransactionItem.DiscountAmount,
		Subtotal:       domainTransactionItem.Subtotal,
		RentalId:       domainTransactionItem.RentalId,
		Note:           domainTransactionItem.Note,
	}
}

func ToTransactionItemsListDomain(dbTransactionItems []TransactionItem) []domain.TransactionItem {
	if dbTransactionItems == nil {
		return nil
	}

	domainTransactionItems := []domain.TransactionItem{}
	for _, dbTranItem := range dbTransactionItems {
		domainTransactionItems = append(domainTransactionItems, ToTransactionItemDomain(dbTranItem))
	}
	return domainTransactionItems
}

func ToTransactionItemsListDB(domainTransactionItems []domain.TransactionItem) []TransactionItem {
	if domainTransactionItems == nil {
		return nil
	}

	dbTransactionItems := []TransactionItem{}
	for _, domainTranItem := range domainTransactionItems {
		dbTransactionItems = append(dbTransactionItems, ToTransactionItemDB(domainTranItem))
	}
	return dbTransactionItems
}

func ToTransactionStatisticDomain(dbTransactionStatistic TransactionStatistic) domain.TransactionStatistic {
	return domain.TransactionStatistic{
		Date:        dbTransactionStatistic.Date,
		Total:       dbTransactionStatistic.Total,
		TotalIncome: dbTransactionStatistic.TotalIncome,
	}
}

func ToTransactionStatisticsListDomain(dbTransactionStatistics []TransactionStatistic) []domain.TransactionStatistic {
	if dbTransactionStatistics == nil {
		return nil
	}

	domainTransactionStatistics := []domain.TransactionStatistic{}
	for _, dbTranStat := range dbTransactionStatistics {
		domainTransactionStatistics = append(domainTransactionStatistics, ToTransactionStatisticDomain(dbTranStat))
	}
	return domainTransactionStatistics
}
