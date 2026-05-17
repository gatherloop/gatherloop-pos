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
	materials, err := usecase.materialRepository.GetMaterialList(ctx, "", CreatedAt, Ascending, 0, 0)
	if err != nil {
		return StockCheck{}, err
	}

	itemMap := make(map[int64]int, len(itemRequests))
	for _, req := range itemRequests {
		itemMap[req.MaterialId] = req.CurrentStock
	}

	items := make([]StockCheckItem, 0, len(materials))
	for _, m := range materials {
		currentStock := 0
		if cs, ok := itemMap[m.Id]; ok {
			currentStock = cs
		}
		items = append(items, StockCheckItem{
			MaterialId:       m.Id,
			CurrentStock:     currentStock,
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

	itemMap := make(map[int64]int, len(itemRequests))
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
	totalEstimatedCost := float64(0)
	materialIds := []int64{}

	for _, item := range stockCheck.Items {
		if item.CurrentStock <= item.MinimumStock && item.NormalStock > item.MinimumStock {
			materialIds = append(materialIds, item.MaterialId)
		}
	}

	materialSuppliersByMaterial, err := usecase.materialRepository.GetMaterialSuppliersByMaterialIds(ctx, materialIds)
	if err != nil {
		return PurchaseList{}, err
	}

	for _, item := range stockCheck.Items {
		if item.CurrentStock <= item.MinimumStock && item.NormalStock > item.MinimumStock {
			purchaseQuantity := item.NormalStock - item.CurrentStock
			estimatedCost := float64(purchaseQuantity) * float64(item.PurchaseUnitSize) * float64(item.Price)
			totalEstimatedCost += estimatedCost
			suppliers := materialSuppliersByMaterial[item.MaterialId]
			if suppliers == nil {
				suppliers = []MaterialSupplier{}
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
