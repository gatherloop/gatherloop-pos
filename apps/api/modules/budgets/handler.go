package budgets

import (
	"apps/api/modules/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase Usecase
}

func NewHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetBudgetList(w http.ResponseWriter, r *http.Request) {
	budgets, err := handler.usecase.GetBudgetList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.BudgetList200Response{Data: budgets})
	w.Write(response)
}

func (handler Handler) GetBudgetById(w http.ResponseWriter, r *http.Request) {
	id, err := GetBudgetId(w, r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	Budget, err := handler.usecase.GetBudgetById(id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	response, err := json.Marshal(apiContract.BudgetFindById200Response{Data: Budget})
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	w.Write(response)
}

func (handler Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	var budgetRequest apiContract.BudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&budgetRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateBudget(budgetRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateBudgetById(w http.ResponseWriter, r *http.Request) {
	id, err := GetBudgetId(w, r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	var budgetRequest apiContract.BudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&budgetRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateBudgetById(budgetRequest, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	w.Write(response)
}

func (handler Handler) DeleteBudgetById(w http.ResponseWriter, r *http.Request) {
	id, err := GetBudgetId(w, r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteBudgetById(id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	w.Write(response)
}
