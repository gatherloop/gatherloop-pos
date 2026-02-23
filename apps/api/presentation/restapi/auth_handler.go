package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
	"time"
)

type AuthHandler struct {
	usecase domain.AuthUsecase
}

func NewAuthHandler(usecase domain.AuthUsecase) AuthHandler {
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
		Domain:   GetOriginDomain(r),
		Name:     "Authorization",
		Value:    "Bearer " + token,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
	}
	http.SetCookie(w, &cookie)

	WriteResponse(w, apiContract.AuthLoginResponse{Data: token})
}

func (handler AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie := http.Cookie{
		Domain:   GetOriginDomain(r),
		Name:     "Authorization",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		Expires:  time.Unix(0, 0),
	}
	http.SetCookie(w, &cookie)

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
