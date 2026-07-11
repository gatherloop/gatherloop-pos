package domain

import "context"

type StockCheckUsecase struct {
	stockCheckRepository StockCheckRepository
	materialRepository   MaterialRepository
}

func NewStockCheckUsecase(stockCheckRepository StockCheckRepository, materialRepository MaterialRepository) StockCheckUsecase {
	return StockCheckUsecase{stockCheckRepository: stockCheckRepository, materialRepository: materialRepository}
}

func (usecase StockCheckUsecase) GetStockCheckList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]StockCheck, int64, *Error) {
	stockChecks, err := usecase.stockCheckRepository.GetStockCheckList(ctx, sortBy, order, skip, limit)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	total, err := usecase.stockCheckRepository.GetStockCheckListTotal(ctx)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	return stockChecks, total, nil
}

func (usecase StockCheckUsecase) GetStockCheckById(ctx context.Context, id int64) (StockCheck, *Error) {
	return usecase.stockCheckRepository.GetStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) CreateStockCheck(ctx context.Context, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	materials, err := usecase.materialRepository.GetMaterialList(ctx, "", CreatedAt, Ascending, 0, 0, nil)
	if err != nil {
		return StockCheck{}, err
	}

	materialMap := make(map[int64]Material, len(materials))
	for _, m := range materials {
		materialMap[m.Id] = m
	}

	// Only the materials the caller actually submitted become stock check items.
	// The create form seeds rows exclusively from stock-check-required materials,
	// so building items from the catalog here would silently re-add excluded ones
	// (with a made-up currentStock of 0), leaking them into edit and the purchase list.
	items := make([]StockCheckItem, 0, len(itemRequests))
	for _, req := range itemRequests {
		m, ok := materialMap[req.MaterialId]
		if !ok {
			continue
		}
		items = append(items, StockCheckItem{
			MaterialId:       m.Id,
			CurrentStock:     req.CurrentStock,
			MaterialName:     m.Name,
			Price:            m.Price,
			PurchaseUnit:     m.PurchaseUnit,
			PurchaseUnitSize: m.PurchaseUnitSize,
			MinimumStock:     m.MinimumStock,
			NormalStock:      m.NormalStock,
		})
	}

	return usecase.stockCheckRepository.CreateStockCheck(ctx, StockCheck{Items: items})
}

func (usecase StockCheckUsecase) UpdateStockCheckById(ctx context.Context, id int64, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	stockCheck, err := usecase.stockCheckRepository.GetStockCheckById(ctx, id)
	if err != nil {
		return StockCheck{}, err
	}

	itemMap := make(map[int64]int64, len(itemRequests))
	for _, req := range itemRequests {
		itemMap[req.MaterialId] = req.CurrentStock
	}

	for i, item := range stockCheck.Items {
		if cs, ok := itemMap[item.MaterialId]; ok {
			stockCheck.Items[i].CurrentStock = cs
		}
	}

	return usecase.stockCheckRepository.UpdateStockCheckById(ctx, stockCheck, id)
}

func (usecase StockCheckUsecase) DeleteStockCheckById(ctx context.Context, id int64) *Error {
	return usecase.stockCheckRepository.DeleteStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) GetPurchaseList(ctx context.Context, stockCheckId int64) (PurchaseList, *Error) {
	stockCheck, err := usecase.stockCheckRepository.GetStockCheckById(ctx, stockCheckId)
	if err != nil {
		return PurchaseList{}, err
	}

	items := []PurchaseListItem{}
	totalEstimatedCost := float32(0)

	for _, item := range stockCheck.Items {
		if item.CurrentStock <= item.MinimumStock && item.NormalStock > item.MinimumStock {
			purchaseQuantity := item.NormalStock - item.CurrentStock
			estimatedCost := float32(purchaseQuantity) * float32(item.PurchaseUnitSize) * float32(item.Price)
			totalEstimatedCost += estimatedCost

			material, materialErr := usecase.materialRepository.GetMaterialById(ctx, item.MaterialId)
			suppliers := []MaterialSupplier{}
			if materialErr == nil {
				suppliers = material.Suppliers
			}

			items = append(items, PurchaseListItem{
				MaterialId:       item.MaterialId,
				MaterialName:     item.MaterialName,
				CurrentStock:     item.CurrentStock,
				MinimumStock:     item.MinimumStock,
				NormalStock:      item.NormalStock,
				PurchaseUnit:     item.PurchaseUnit,
				PurchaseUnitSize: item.PurchaseUnitSize,
				PurchaseQuantity: purchaseQuantity,
				EstimatedCost:    estimatedCost,
				Suppliers:        suppliers,
			})
		}
	}

	return PurchaseList{
		StockCheckId:       stockCheck.Id,
		StockCheckDate:     stockCheck.CreatedAt.Format("2006-01-02"),
		TotalEstimatedCost: totalEstimatedCost,
		Items:              items,
	}, nil
}
