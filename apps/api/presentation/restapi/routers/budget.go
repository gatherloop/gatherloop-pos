package routers

import (
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type BudgetRouter struct {
	handler handlers.BudgetHandler
}

func NewBudgetRouter(handler handlers.BudgetHandler) BudgetRouter {
	return BudgetRouter{handler: handler}
}

func (budgetRouter BudgetRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/budgets", budgetRouter.handler.GetBudgetList).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", budgetRouter.handler.GetBudgetById).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", budgetRouter.handler.DeleteBudgetById).Methods(http.MethodDelete)
	router.HandleFunc("/budgets/{budgetId}", budgetRouter.handler.UpdateBudgetById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/budgets", budgetRouter.handler.CreateBudget).Methods(http.MethodPost, http.MethodOptions)
}
