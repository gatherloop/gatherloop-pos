package routers

import (
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type AuthRouter struct {
	handler handlers.AuthHandler
}

func NewAuthRouter(handler handlers.AuthHandler) AuthRouter {
	return AuthRouter{handler: handler}
}

func (authRouter AuthRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/auth/login", authRouter.handler.Login).Methods(http.MethodPost, http.MethodOptions)
}
