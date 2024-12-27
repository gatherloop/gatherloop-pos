package base

import (
	"apps/api/domain/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	var httpStatus int
	switch err.Code {
	case apiContract.SERVER_ERROR:
		httpStatus = http.StatusInternalServerError
	case apiContract.DATA_NOT_FOUND:
		httpStatus = http.StatusBadRequest
	case apiContract.VALIDATION_ERROR:
		httpStatus = http.StatusBadRequest
	default:
		httpStatus = http.StatusInternalServerError
	}

	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(err)
}

func GetSortBy(r *http.Request) base.SortBy {
	sortByQuery := r.URL.Query().Get("sortBy")
	switch sortByQuery {
	case "created_at":
		return base.CreatedAt
	default:
		return base.CreatedAt
	}
}

func GetOrder(r *http.Request) base.Order {
	orderQuery := r.URL.Query().Get("order")
	switch orderQuery {
	case "asc":
		return base.Ascending
	case "desc":
		return base.Descending
	default:
		return base.Ascending
	}
}

func GetQuery(r *http.Request) string {
	return r.URL.Query().Get("query")
}

func GetGroupBy(r *http.Request) string {
	return r.URL.Query().Get("groupBy")
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
