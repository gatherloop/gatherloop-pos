package domain

import (
	"context"
	"fmt"
)

type StockCheckUsecase struct {
	repository         StockCheckRepository
	materialRepository MaterialRepository
}

func NewStockCheckUsecase(repository StockCheckRepository, materialRepository MaterialRepository) StockCheckUsecase {
	return StockCheckUsecase{repository: repository, materialRepository: materialRepository}
}

func (usecase StockCheckUsecase) GetStockCheckList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]StockCheck, int64, *Error) {
	stockChecks, err := usecase.repository.GetStockCheckList(ctx, sortBy, order, skip, limit)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	total, err := usecase.repository.GetStockCheckListTotal(ctx)
	if err != nil {
		return []StockCheck{}, 0, err
	}

	return stockChecks, total, nil
}

func (usecase StockCheckUsecase) GetStockCheckById(ctx context.Context, id int64) (StockCheck, *Error) {
	return usecase.repository.GetStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) CreateStockCheck(ctx context.Context, stockCheck StockCheck, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	existing, existErr := usecase.repository.GetStockCheckByDate(ctx, stockCheck.CheckDate)
	if existErr == nil && existing.Id != 0 {
		return StockCheck{}, &Error{
			Type:    BadRequest,
			Message: fmt.Sprintf("a stock check for %s already exists", stockCheck.CheckDate),
		}
	}

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
			MaterialId:               m.Id,
			CurrentStock:             currentStock,
			MaterialName:             m.Name,
			PriceSnapshot:            m.Price,
			PurchaseUnitSnapshot:     m.PurchaseUnit,
			PurchaseUnitSizeSnapshot: m.PurchaseUnitSize,
			MinimumStockSnapshot:     m.MinimumStock,
			NormalStockSnapshot:      m.NormalStock,
		})
	}

	stockCheck.Items = items
	return usecase.repository.CreateStockCheck(ctx, stockCheck)
}

func (usecase StockCheckUsecase) UpdateStockCheckById(ctx context.Context, id int64, note *string, itemRequests []StockCheckItemRequest) (StockCheck, *Error) {
	stockCheck, err := usecase.repository.GetStockCheckById(ctx, id)
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

	if note != nil {
		stockCheck.Note = note
	}

	return usecase.repository.UpdateStockCheckById(ctx, stockCheck, id)
}

func (usecase StockCheckUsecase) DeleteStockCheckById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteStockCheckById(ctx, id)
}

func (usecase StockCheckUsecase) GetPurchaseList(ctx context.Context, stockCheckId int64) (PurchaseList, *Error) {
	stockCheck, err := usecase.repository.GetStockCheckById(ctx, stockCheckId)
	if err != nil {
		return PurchaseList{}, err
	}

	items := []PurchaseListItem{}
	totalEstimatedCost := float64(0)

	for _, item := range stockCheck.Items {
		if item.CurrentStock <= item.MinimumStockSnapshot && item.NormalStockSnapshot > item.MinimumStockSnapshot {
			purchaseQuantity := item.NormalStockSnapshot - item.CurrentStock
			estimatedCost := float64(purchaseQuantity) * float64(item.PurchaseUnitSizeSnapshot) * float64(item.PriceSnapshot)
			totalEstimatedCost += estimatedCost
			items = append(items, PurchaseListItem{
				MaterialId:       item.MaterialId,
				MaterialName:     item.MaterialName,
				CurrentStock:     item.CurrentStock,
				MinimumStock:     item.MinimumStockSnapshot,
				NormalStock:      item.NormalStockSnapshot,
				PurchaseUnit:     item.PurchaseUnitSnapshot,
				PurchaseUnitSize: item.PurchaseUnitSizeSnapshot,
				PurchaseQuantity: purchaseQuantity,
				EstimatedCost:    estimatedCost,
			})
		}
	}

	return PurchaseList{
		StockCheckId:       stockCheck.Id,
		StockCheckDate:     stockCheck.CheckDate,
		TotalEstimatedCost: totalEstimatedCost,
		Items:              items,
	}, nil
}
