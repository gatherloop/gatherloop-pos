package restapi

import (
	"apps/api/domain/auth"
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

	loginRequest, err := GetLoginRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	token, err := handler.usecase.Login(ctx, ToLoginRequest(loginRequest))
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.AuthLogin200Response{Data: token})
}
