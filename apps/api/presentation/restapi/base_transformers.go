package restapi

import (
	"apps/api/domain/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"
	"strings"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	w.WriteHeader(ToHttpStatus(err))
	json.NewEncoder(w).Encode(err)
}

func WriteResponse(w http.ResponseWriter, response any) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func ToHttpStatus(err apiContract.Error) int {
	switch err.Code {
	case apiContract.BAD_REQUEST:
		return http.StatusBadRequest
	case apiContract.NOT_FOUND:
		return http.StatusNotFound
	case apiContract.UNAUTHORIZED:
		return http.StatusUnauthorized
	case apiContract.INTERNAL_SERVER_ERROR:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

func ToErrorCode(errorType base.ErrorType) apiContract.ErrorCode {
	switch errorType {
	case base.BadRequest:
		return apiContract.BAD_REQUEST
	case base.NotFound:
		return apiContract.NOT_FOUND
	case base.Unauthorized:
		return apiContract.UNAUTHORIZED
	case base.InternalServerError:
		return apiContract.INTERNAL_SERVER_ERROR
	default:
		return apiContract.INTERNAL_SERVER_ERROR
	}
}

func GetDomain(r *http.Request) string {
	host := r.Host
	domain := strings.TrimPrefix(host, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.Split(domain, ":")[0]
	return domain
}

func GetOriginDomain(r *http.Request) string {
	host := r.Header.Get("Origin")
	domain := strings.TrimPrefix(host, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.Split(domain, ":")[0]
	return domain
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
