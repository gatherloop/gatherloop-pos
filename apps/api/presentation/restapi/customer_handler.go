package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type CustomerHandler struct {
	usecase domain.CustomerUsecase
}

func NewCustomerHandler(usecase domain.CustomerUsecase) CustomerHandler {
	return CustomerHandler{usecase: usecase}
}

func (handler CustomerHandler) GetCurrentCustomer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	name, err := handler.usecase.GetCurrentCustomerName(ctx, sessionId)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.CustomerResponse{Data: ToApiCustomer(name)})
}
