package domain

import "context"

type StockCheckUsecase struct {
	stockCheckRepoPort StockCheckRepoPort
	materialRepoPort   MaterialRepoPort
}

func NewStockCheckUsecase(stockCheckRepoPort StockCheckRepoPort, materialRepoPort MaterialRepoPort) StockCheckUsecase {
	return StockCheckUsecase{stockCheckRepoPort: stockCheckRepoPort, materialRepoPort: materialRepoPort}
}

func (usecase StockCheckUsecase) GetStockCheckList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]StockCheck, int64, *Error) {
	stockChecks, err := usecase.stockCheckRepoPort.GetStockCheckList(ctx, sortBy, order, skip, limit)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	total, err := usecase.stockCheckRepoPort.GetStockCheckListTotal(ctx)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	return stockChecks, total, nil
}

func (usecase StockCheckUsecase) GetStockCheckById(ctx context.Context, id int64) (StockCheck, *Error) {
	return usecase.stockCheckRepoPort.GetStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) CreateStockCheck(ctx context.Context, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	materials, err := usecase.materialRepoPort.GetMaterialList(ctx, "", CreatedAt, Ascending, 0, 0, nil)
	if err != nil {
		return StockCheck{}, err
	}

	materialMap := make(map[int64]Material, len(materials))
	for _, m := range materials {
		materialMap[m.Id] = m
	}

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

	return usecase.stockCheckRepoPort.CreateStockCheck(ctx, StockCheck{Items: items})
}

func (usecase StockCheckUsecase) UpdateStockCheckById(ctx context.Context, id int64, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	stockCheck, err := usecase.stockCheckRepoPort.GetStockCheckById(ctx, id)
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

	return usecase.stockCheckRepoPort.UpdateStockCheckById(ctx, stockCheck, id)
}

func (usecase StockCheckUsecase) DeleteStockCheckById(ctx context.Context, id int64) *Error {
	return usecase.stockCheckRepoPort.DeleteStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) GetPurchaseList(ctx context.Context, stockCheckId int64) (PurchaseList, *Error) {
	stockCheck, err := usecase.stockCheckRepoPort.GetStockCheckById(ctx, stockCheckId)
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

			material, materialErr := usecase.materialRepoPort.GetMaterialById(ctx, item.MaterialId)
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
