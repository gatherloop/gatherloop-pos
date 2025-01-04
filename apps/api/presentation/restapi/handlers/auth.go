package handlers

import (
	"apps/api/domain/auth"
	"apps/api/presentation/restapi"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type AuthHandler struct {
	usecase auth.Usecase
}

func NewAuthHandler(usecase auth.Usecase) AuthHandler {
	return AuthHandler{usecase: usecase}
}

func (handler AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	loginRequest, err := restapi.GetLoginRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	token, err := handler.usecase.Login(ctx, restapi.ToLoginRequest(loginRequest))
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	cookie := http.Cookie{
		Name:     "Authorization",
		Value:    "Bearer " + token,
		Path:     "/",
		HttpOnly: true,
	}
	http.SetCookie(w, &cookie)

	json.NewEncoder(w).Encode(apiContract.AuthLogin200Response{Data: token})
}
