package routers

import (
	"apps/api/presentation/restapi"
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type ExpenseRouter struct {
	handler handlers.ExpenseHandler
}

func NewExpenseRouter(handler handlers.ExpenseHandler) ExpenseRouter {
	return ExpenseRouter{handler: handler}
}

func (expenseRouter ExpenseRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/expenses", restapi.CheckAuth(expenseRouter.handler.GetExpenseList)).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", restapi.CheckAuth(expenseRouter.handler.GetExpenseById)).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", restapi.CheckAuth(expenseRouter.handler.UpdateExpenseById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", restapi.CheckAuth(expenseRouter.handler.DeleteExpenseById)).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", restapi.CheckAuth(expenseRouter.handler.CreateExpense)).Methods(http.MethodPost, http.MethodOptions)
}
