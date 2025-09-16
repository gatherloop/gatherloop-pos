package restapi

import (
	"apps/api/domain/transactionCategory"
	apiContract "libs/api-contract"
	"net/http"
)

type TransactionCategoryHandler struct {
	usecase transactionCategory.Usecase
}

func NewTransactionCategoryHandler(usecase transactionCategory.Usecase) TransactionCategoryHandler {
	return TransactionCategoryHandler{usecase: usecase}
}

func (handler TransactionCategoryHandler) GetTransactionCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transcationCategories, err := handler.usecase.GetTransactionCategoryList(ctx)
	if err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiTransactionCategories := []apiContract.TransactionCategory{}
	for _, transactionCategory := range transcationCategories {
		apiTransactionCategories = append(apiTransactionCategories, ToApiTransactionCategory(transactionCategory))
	}

	WriteResponse(w, apiContract.TransactionCategoryList200Response{Data: apiTransactionCategories})
}

func (handler TransactionCategoryHandler) GetTransactionCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transcationCategory, baseError := handler.usecase.GetTransactionCategoryById(ctx, id)
	if baseError != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(baseError.Type), Message: baseError.Message})
		return
	}

	WriteResponse(w, apiContract.TransactionCategoryFindById200Response{Data: ToApiTransactionCategory(transcationCategory)})
}

func (handler TransactionCategoryHandler) CreateTransactionCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionCategoryRequest, err := GetTransactionCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateTransactionCategory(ctx, ToTransactionCategory(transactionCategoryRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionCategoryHandler) UpdateTransactionCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactionCategoryRequest, err := GetTransactionCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateTransactionCategoryById(ctx, ToTransactionCategory(transactionCategoryRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionCategoryHandler) DeleteTransactionCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTransactionCategoryById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
