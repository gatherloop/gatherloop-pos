package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type CalculationRouter struct {
	handler CalculationHandler
}

func NewCalculationRouter(handler CalculationHandler) CalculationRouter {
	return CalculationRouter{handler: handler}
}

func (expenseRouter CalculationRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/calculations", CheckAuth(expenseRouter.handler.GetCalculationList)).Methods(http.MethodGet)
	router.HandleFunc("/calculations/{calculationId}", CheckAuth(expenseRouter.handler.GetCalculationById)).Methods(http.MethodGet)
	router.HandleFunc("/calculations/{calculationId}", CheckAuth(expenseRouter.handler.UpdateCalculationById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/calculations/{calculationId}", CheckAuth(expenseRouter.handler.DeleteCalculationById)).Methods(http.MethodDelete)
	router.HandleFunc("/calculations/{calculationId}/complete", CheckAuth(expenseRouter.handler.CompleteCalculationById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/calculations", CheckAuth(expenseRouter.handler.CreateCalculation)).Methods(http.MethodPost, http.MethodOptions)
}
