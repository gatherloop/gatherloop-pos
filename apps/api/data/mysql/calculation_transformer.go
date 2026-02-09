package mysql

import "apps/api/domain"

func ToCalculationDB(domainCalculation domain.Calculation) Calculation {
	return Calculation{
		Id:               domainCalculation.Id,
		CreatedAt:        domainCalculation.CreatedAt,
		UpdatedAt:        domainCalculation.UpdatedAt,
		DeletedAt:        domainCalculation.DeletedAt,
		CompletedAt:      domainCalculation.CompletedAt,
		WalletId:         domainCalculation.WalletId,
		Wallet:           ToWalletDB(domainCalculation.Wallet),
		TotalWallet:      domainCalculation.TotalWallet,
		TotalCalculation: domainCalculation.TotalCalculation,
		CalculationItems: ToCalculationItemListDB(domainCalculation.CalculationItems),
	}
}

func ToCalculationDomain(dbCalculation Calculation) domain.Calculation {
	return domain.Calculation{
		Id:               dbCalculation.Id,
		CreatedAt:        dbCalculation.CreatedAt,
		UpdatedAt:        dbCalculation.UpdatedAt,
		DeletedAt:        dbCalculation.DeletedAt,
		CompletedAt:      dbCalculation.CompletedAt,
		WalletId:         dbCalculation.WalletId,
		Wallet:           ToWalletDomain(dbCalculation.Wallet),
		TotalWallet:      dbCalculation.TotalWallet,
		TotalCalculation: dbCalculation.TotalCalculation,
		CalculationItems: ToCalculationItemListDomain(dbCalculation.CalculationItems),
	}
}

func ToCalculationsListDomain(dbCalculations []Calculation) []domain.Calculation {
	var domainCalculations []domain.Calculation
	for _, dbCal := range dbCalculations {
		domainCalculations = append(domainCalculations, ToCalculationDomain(dbCal))
	}
	return domainCalculations
}

func ToCalculationItemDB(domainItem domain.CalculationItem) CalculationItem {
	return CalculationItem{
		Id:            domainItem.Id,
		CalculationId: domainItem.CalculationId,
		Price:         domainItem.Price,
		Amount:        domainItem.Amount,
		Subtotal:      domainItem.Subtotal,
	}
}

func ToCalculationItemDomain(dbItem CalculationItem) domain.CalculationItem {
	return domain.CalculationItem{
		Id:            dbItem.Id,
		CalculationId: dbItem.CalculationId,
		Price:         dbItem.Price,
		Amount:        dbItem.Amount,
		Subtotal:      dbItem.Subtotal,
	}
}

func ToCalculationItemListDB(domainItems []domain.CalculationItem) []CalculationItem {
	var dbItems []CalculationItem
	for _, domainItem := range domainItems {
		dbItems = append(dbItems, ToCalculationItemDB(domainItem))
	}
	return dbItems
}

func ToCalculationItemListDomain(dbItems []CalculationItem) []domain.CalculationItem {
	var domainItems []domain.CalculationItem
	for _, dbItem := range dbItems {
		domainItems = append(domainItems, ToCalculationItemDomain(dbItem))
	}
	return domainItems
}
