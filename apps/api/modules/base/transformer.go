package base

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	response, _ := json.Marshal(err)
	w.WriteHeader(500)
	w.Write(response)
}
