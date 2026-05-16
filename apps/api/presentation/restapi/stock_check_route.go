package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type StockCheckRouter struct {
	handler StockCheckHandler
}

func NewStockCheckRouter(handler StockCheckHandler) StockCheckRouter {
	return StockCheckRouter{handler: handler}
}

func (r StockCheckRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/stock-checks", CheckAuth(r.handler.GetStockCheckList)).Methods(http.MethodGet)
	router.HandleFunc("/stock-checks", CheckAuth(r.handler.CreateStockCheck)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/stock-checks/{stockCheckId}", CheckAuth(r.handler.GetStockCheckById)).Methods(http.MethodGet)
	router.HandleFunc("/stock-checks/{stockCheckId}", CheckAuth(r.handler.UpdateStockCheckById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/stock-checks/{stockCheckId}", CheckAuth(r.handler.DeleteStockCheckById)).Methods(http.MethodDelete)
	router.HandleFunc("/stock-checks/{stockCheckId}/purchase-list", CheckAuth(r.handler.GetPurchaseList)).Methods(http.MethodGet)
}
