package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type ExpenseRouter struct {
	handler ExpenseHandler
}

func NewExpenseRouter(handler ExpenseHandler) ExpenseRouter {
	return ExpenseRouter{handler: handler}
}

func (expenseRouter ExpenseRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/expenses", CheckAuth(expenseRouter.handler.GetExpenseList)).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", CheckAuth(expenseRouter.handler.GetExpenseById)).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", CheckAuth(expenseRouter.handler.UpdateExpenseById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", CheckAuth(expenseRouter.handler.DeleteExpenseById)).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", CheckAuth(expenseRouter.handler.CreateExpense)).Methods(http.MethodPost, http.MethodOptions)
}
