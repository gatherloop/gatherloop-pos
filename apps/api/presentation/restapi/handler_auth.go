package restapi

import (
	"apps/api/domain/auth"
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
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	token, usecaseErr := handler.usecase.Login(ctx, ToLoginRequest(loginRequest))
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	cookie := http.Cookie{
		Name:     "Authorization",
		Value:    "Bearer " + token,
		Path:     "/",
		HttpOnly: true,
	}
	http.SetCookie(w, &cookie)

	WriteResponse(w, apiContract.AuthLogin200Response{Data: token})
}
