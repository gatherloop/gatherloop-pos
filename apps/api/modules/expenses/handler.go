package expenses

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

func (handler Handler) GetExpenseList(w http.ResponseWriter, r *http.Request) {
	expenses, err := handler.usecase.GetExpenseList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.ExpenseList200Response{Data: expenses})
	w.Write(response)
}

func (handler Handler) GetExpenseById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	expense, err := handler.usecase.GetExpenseById(id)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.ExpenseFindById200Response{Data: expense})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var expenseRequest apiContract.ExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&expenseRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateExpense(expenseRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateExpenseById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var expenseRequest apiContract.ExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&expenseRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.UpdateExpenseById(expenseRequest, id); err != nil {
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

func (handler Handler) DeleteExpenseById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	if err := handler.usecase.DeleteExpenseById(id); err != nil {
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
