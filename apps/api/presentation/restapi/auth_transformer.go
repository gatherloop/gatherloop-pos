package restapi

import (
	"apps/api/domain/auth"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

func GetLoginRequest(r *http.Request) (apiContract.AuthLoginRequest, error) {
	var loginRequest apiContract.AuthLoginRequest
	err := json.NewDecoder(r.Body).Decode(&loginRequest)
	return loginRequest, err
}

func ToLoginRequest(loginRequest apiContract.AuthLoginRequest) auth.LoginRequest {
	return auth.LoginRequest{
		Username: loginRequest.Username,
		Password: loginRequest.Password,
	}
}
