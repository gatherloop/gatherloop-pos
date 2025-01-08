package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type BudgetRouter struct {
	handler BudgetHandler
}

func NewBudgetRouter(handler BudgetHandler) BudgetRouter {
	return BudgetRouter{handler: handler}
}

func (budgetRouter BudgetRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/budgets", CheckAuth(budgetRouter.handler.GetBudgetList)).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", CheckAuth(budgetRouter.handler.GetBudgetById)).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", CheckAuth(budgetRouter.handler.DeleteBudgetById)).Methods(http.MethodDelete)
	router.HandleFunc("/budgets/{budgetId}", CheckAuth(budgetRouter.handler.UpdateBudgetById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/budgets", CheckAuth(budgetRouter.handler.CreateBudget)).Methods(http.MethodPost, http.MethodOptions)
}
