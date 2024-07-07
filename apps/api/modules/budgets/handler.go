package budgets

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
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
	vars := mux.Vars(r)
	idParam := vars["budgetId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	Budget, err := handler.usecase.GetBudgetById(id)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.BudgetFindById200Response{Data: Budget})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	var budgetRequest apiContract.BudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&budgetRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateBudget(budgetRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateBudgetById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["budgetId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var budgetRequest apiContract.BudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&budgetRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.UpdateBudgetById(budgetRequest, id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) DeleteBudgetById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["budgetId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	if err := handler.usecase.DeleteBudgetById(id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}
