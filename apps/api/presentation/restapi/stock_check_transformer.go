package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetStockCheckId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["stockCheckId"]
	return strconv.ParseInt(idParam, 10, 64)
}

func GetStockCheckRequest(r *http.Request) (apiContract.StockCheckRequest, error) {
	var req apiContract.StockCheckRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func GetStockCheckUpdateRequest(r *http.Request) (apiContract.StockCheckUpdateRequest, error) {
	var req apiContract.StockCheckUpdateRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func ToApiStockCheckItem(item domain.StockCheckItem) apiContract.StockCheckItem {
	return apiContract.StockCheckItem{
		Id:                       item.Id,
		StockCheckId:             item.StockCheckId,
		MaterialId:               item.MaterialId,
		CurrentStock:             item.CurrentStock,
		MaterialName:             item.MaterialName,
		PriceSnapshot:            item.PriceSnapshot,
		PurchaseUnitSnapshot:     item.PurchaseUnitSnapshot,
		PurchaseUnitSizeSnapshot: item.PurchaseUnitSizeSnapshot,
		MinimumStockSnapshot:     item.MinimumStockSnapshot,
		NormalStockSnapshot:      item.NormalStockSnapshot,
		CreatedAt:                item.CreatedAt,
	}
}

func ToApiStockCheck(sc domain.StockCheck) apiContract.StockCheck {
	items := make([]apiContract.StockCheckItem, 0, len(sc.Items))
	for _, item := range sc.Items {
		items = append(items, ToApiStockCheckItem(item))
	}
	return apiContract.StockCheck{
		Id:        sc.Id,
		CheckDate: sc.CheckDate,
		Note:      sc.Note,
		CreatedBy: sc.CreatedBy,
		CreatedAt: sc.CreatedAt,
		DeletedAt: sc.DeletedAt,
		Items:     items,
	}
}

func ToApiPurchaseListItem(item domain.PurchaseListItem) apiContract.PurchaseListItem {
	return apiContract.PurchaseListItem{
		MaterialId:       item.MaterialId,
		MaterialName:     item.MaterialName,
		CurrentStock:     item.CurrentStock,
		MinimumStock:     item.MinimumStock,
		NormalStock:      item.NormalStock,
		PurchaseUnit:     item.PurchaseUnit,
		PurchaseUnitSize: item.PurchaseUnitSize,
		PurchaseQuantity: item.PurchaseQuantity,
		EstimatedCost:    item.EstimatedCost,
	}
}

func ToApiPurchaseList(pl domain.PurchaseList) apiContract.PurchaseList {
	items := make([]apiContract.PurchaseListItem, 0, len(pl.Items))
	for _, item := range pl.Items {
		items = append(items, ToApiPurchaseListItem(item))
	}
	return apiContract.PurchaseList{
		StockCheckId:       pl.StockCheckId,
		StockCheckDate:     pl.StockCheckDate,
		TotalEstimatedCost: pl.TotalEstimatedCost,
		Items:              items,
	}
}

func ToStockCheckItemRequests(apiItems []apiContract.StockCheckItemRequest) []domain.StockCheckItemRequest {
	reqs := make([]domain.StockCheckItemRequest, 0, len(apiItems))
	for _, item := range apiItems {
		reqs = append(reqs, domain.StockCheckItemRequest{
			MaterialId:   item.MaterialId,
			CurrentStock: item.CurrentStock,
		})
	}
	return reqs
}
