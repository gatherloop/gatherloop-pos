package mysql

import "apps/api/domain"

func ToStockCheckItemDB(d domain.StockCheckItem) StockCheckItem {
	return StockCheckItem{
		Id:                       d.Id,
		StockCheckId:             d.StockCheckId,
		MaterialId:               d.MaterialId,
		CurrentStock:             d.CurrentStock,
		MaterialName:             d.MaterialName,
		PriceSnapshot:            d.PriceSnapshot,
		PurchaseUnitSnapshot:     d.PurchaseUnitSnapshot,
		PurchaseUnitSizeSnapshot: d.PurchaseUnitSizeSnapshot,
		MinimumStockSnapshot:     d.MinimumStockSnapshot,
		NormalStockSnapshot:      d.NormalStockSnapshot,
		CreatedAt:                d.CreatedAt,
	}
}

func ToStockCheckItemDomain(db StockCheckItem) domain.StockCheckItem {
	return domain.StockCheckItem{
		Id:                       db.Id,
		StockCheckId:             db.StockCheckId,
		MaterialId:               db.MaterialId,
		CurrentStock:             db.CurrentStock,
		MaterialName:             db.MaterialName,
		PriceSnapshot:            db.PriceSnapshot,
		PurchaseUnitSnapshot:     db.PurchaseUnitSnapshot,
		PurchaseUnitSizeSnapshot: db.PurchaseUnitSizeSnapshot,
		MinimumStockSnapshot:     db.MinimumStockSnapshot,
		NormalStockSnapshot:      db.NormalStockSnapshot,
		CreatedAt:                db.CreatedAt,
	}
}

func ToStockCheckDB(d domain.StockCheck) StockCheck {
	items := make([]StockCheckItem, 0, len(d.Items))
	for _, item := range d.Items {
		items = append(items, ToStockCheckItemDB(item))
	}
	return StockCheck{
		Id:        d.Id,
		CheckDate: d.CheckDate,
		Note:      d.Note,
		CreatedBy: d.CreatedBy,
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
		CheckDate: db.CheckDate,
		Note:      db.Note,
		CreatedBy: db.CreatedBy,
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
