package base

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	// TODO: need to map http status code based on error type
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(err)
}

func GetSortBy(r *http.Request) string {
	return r.URL.Query().Get("sortBy")
}

func GetOrder(r *http.Request) string {
	return r.URL.Query().Get("order")
}

func GetQuery(r *http.Request) string {
	return r.URL.Query().Get("query")
}

func GetLimit(r *http.Request) (int, error) {
	limitQuery := r.URL.Query().Get("limit")
	if limitQuery == "" {
		return 0, nil
	} else {
		return strconv.Atoi(limitQuery)
	}
}

func GetSkip(r *http.Request) (int, error) {
	skipQuery := r.URL.Query().Get("skip")
	if skipQuery == "" {
		return 0, nil
	} else {
		return strconv.Atoi(skipQuery)
	}
}
