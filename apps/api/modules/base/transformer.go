package base

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	// TODO: need to map http status code based on error type
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(err)
}
