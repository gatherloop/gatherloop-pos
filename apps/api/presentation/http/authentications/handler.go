package authentications_http

import (
	"apps/api/domain/authentications"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase authentications.Usecase
}

func NewHandler(usecase authentications.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	loginRequest, err := GetLoginRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	token, err := handler.usecase.Login(ctx, ToLoginRequest(loginRequest))
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.AuthenticationLogin200Response{Data: token})
}
