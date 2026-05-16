package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type StockCheckHandler struct {
	usecase domain.StockCheckUsecase
}

func NewStockCheckHandler(usecase domain.StockCheckUsecase) StockCheckHandler {
	return StockCheckHandler{usecase: usecase}
}

func (handler StockCheckHandler) GetStockCheckList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	stockChecks, total, usecaseErr := handler.usecase.GetStockCheckList(ctx, sortBy, order, skip, limit)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiStockChecks := make([]apiContract.StockCheck, 0, len(stockChecks))
	for _, sc := range stockChecks {
		apiStockChecks = append(apiStockChecks, ToApiStockCheck(sc))
	}

	WriteResponse(w, apiContract.StockCheckListResponse{Data: apiStockChecks, Meta: apiContract.MetaPage{Total: total}})
}

func (handler StockCheckHandler) GetStockCheckById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetStockCheckId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	stockCheck, usecaseErr := handler.usecase.GetStockCheckById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.StockCheckFindByIdResponse{Data: ToApiStockCheck(stockCheck)})
}

func (handler StockCheckHandler) CreateStockCheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, err := GetStockCheckRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if req.CheckDate == "" {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: "check_date is required"})
		return
	}

	stockCheck := domain.StockCheck{
		CheckDate: req.CheckDate,
		Note:      req.Note,
	}

	created, usecaseErr := handler.usecase.CreateStockCheck(ctx, stockCheck, ToStockCheckItemRequests(req.Items))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.StockCheckCreateResponse{Data: ToApiStockCheck(created)})
}

func (handler StockCheckHandler) UpdateStockCheckById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetStockCheckId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	req, err := GetStockCheckUpdateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	updated, usecaseErr := handler.usecase.UpdateStockCheckById(ctx, id, req.Note, ToStockCheckItemRequests(req.Items))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.StockCheckUpdateByIdResponse{Data: ToApiStockCheck(updated)})
}

func (handler StockCheckHandler) DeleteStockCheckById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetStockCheckId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.DeleteStockCheckById(ctx, id); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler StockCheckHandler) GetPurchaseList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetStockCheckId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	purchaseList, usecaseErr := handler.usecase.GetPurchaseList(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.PurchaseListResponse{Data: ToApiPurchaseList(purchaseList)})
}
