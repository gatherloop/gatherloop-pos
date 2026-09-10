package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type PaymentHandler struct {
	usecase domain.PaymentUsecase
}

func NewPaymentHandler(usecase domain.PaymentUsecase) PaymentHandler {
	return PaymentHandler{usecase: usecase}
}

func (handler PaymentHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetPaymentCheckoutRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	payment, transaction, usecaseErr := handler.usecase.Checkout(ctx, sessionId, request.CustomerName)
	if usecaseErr != nil {
		apiError := apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message}
		if usecaseErr.Type == domain.BadGateway {
			WriteErrorWithStatus(ctx, w, apiError, http.StatusBadGateway)
			return
		}
		WriteError(ctx, w, apiError)
		return
	}

	WriteResponse(w, apiContract.PaymentResponse{Data: ToApiPayment(payment, transaction)})
}
