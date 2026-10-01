package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type TagRouter struct {
	handler TagHandler
}

func NewTagRouter(handler TagHandler) TagRouter {
	return TagRouter{handler: handler}
}

func (tagRouter TagRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/tags", CheckAuth(tagRouter.handler.GetTagList)).Methods(http.MethodGet)
	router.HandleFunc("/tags/{tagId}", CheckAuth(tagRouter.handler.GetTagById)).Methods(http.MethodGet)
	router.HandleFunc("/tags/{tagId}", CheckAuth(tagRouter.handler.DeleteTagById)).Methods(http.MethodDelete)
	router.HandleFunc("/tags/{tagId}", CheckAuth(tagRouter.handler.UpdateTagById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/tags", CheckAuth(tagRouter.handler.CreateTag)).Methods(http.MethodPost, http.MethodOptions)
}
