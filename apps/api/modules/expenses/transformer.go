package expenses

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetExpenseId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetExpenseRequest(r *http.Request) (apiContract.ExpenseRequest, error) {
	var expenseRequest apiContract.ExpenseRequest
	err := json.NewDecoder(r.Body).Decode(&expenseRequest)
	return expenseRequest, err
}
