package mysql

import "apps/api/domain"

func ToStockCheckItemDB(d domain.StockCheckItem) StockCheckItem {
	return StockCheckItem{
		Id:               d.Id,
		StockCheckId:     d.StockCheckId,
		MaterialId:       d.MaterialId,
		CurrentStock:     d.CurrentStock,
		MaterialName:     d.MaterialName,
		Price:            d.Price,
		PurchaseUnit:     d.PurchaseUnit,
		PurchaseUnitSize: d.PurchaseUnitSize,
		MinimumStock:     d.MinimumStock,
		NormalStock:      d.NormalStock,
		CreatedAt:        d.CreatedAt,
	}
}

func ToStockCheckItemDomain(db StockCheckItem) domain.StockCheckItem {
	return domain.StockCheckItem{
		Id:               db.Id,
		StockCheckId:     db.StockCheckId,
		MaterialId:       db.MaterialId,
		CurrentStock:     db.CurrentStock,
		MaterialName:     db.MaterialName,
		Price:            db.Price,
		PurchaseUnit:     db.PurchaseUnit,
		PurchaseUnitSize: db.PurchaseUnitSize,
		MinimumStock:     db.MinimumStock,
		NormalStock:      db.NormalStock,
		CreatedAt:        db.CreatedAt,
	}
}

func ToStockCheckDB(d domain.StockCheck) StockCheck {
	items := make([]StockCheckItem, 0, len(d.Items))
	for _, item := range d.Items {
		items = append(items, ToStockCheckItemDB(item))
	}
	return StockCheck{
		Id:        d.Id,
		CreatedAt: d.CreatedAt,
		DeletedAt: d.DeletedAt,
		Items:     items,
	}
}

func ToStockCheckDomain(db StockCheck) domain.StockCheck {
	items := make([]domain.StockCheckItem, 0, len(db.Items))
	for _, item := range db.Items {
		items = append(items, ToStockCheckItemDomain(item))
	}
	return domain.StockCheck{
		Id:        db.Id,
		CreatedAt: db.CreatedAt,
		DeletedAt: db.DeletedAt,
		Items:     items,
	}
}

func ToStockCheckListDomain(dbs []StockCheck) []domain.StockCheck {
	result := make([]domain.StockCheck, 0, len(dbs))
	for _, db := range dbs {
		result = append(result, ToStockCheckDomain(db))
	}
	return result
}
