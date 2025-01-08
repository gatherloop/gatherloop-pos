package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type AuthRouter struct {
	handler AuthHandler
}

func NewAuthRouter(handler AuthHandler) AuthRouter {
	return AuthRouter{handler: handler}
}

func (authRouter AuthRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/auth/login", authRouter.handler.Login).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/auth/logout", authRouter.handler.Logout).Methods(http.MethodGet)
}
