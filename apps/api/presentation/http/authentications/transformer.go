package authentications_http

import (
	"apps/api/domain/authentications"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetCategoryId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["categoryId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetLoginRequest(r *http.Request) (apiContract.AuthenticationsLoginRequest, error) {
	var loginRequest apiContract.AuthenticationsLoginRequest
	err := json.NewDecoder(r.Body).Decode(&loginRequest)
	return loginRequest, err
}

func ToLoginRequest(loginRequest apiContract.AuthenticationsLoginRequest) authentications.LoginRequest {
	return authentications.LoginRequest{
		Username: loginRequest.Username,
		Password: loginRequest.Password,
	}
}
