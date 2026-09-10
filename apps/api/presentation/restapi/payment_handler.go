package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

// PaymentHandler serves the session-scoped checkout endpoint (FR-6). Like
// CartHandler and CustomerHandler its route is wrapped in RequireSessionId,
// never CheckAuth — the session ID is the capability that owns the cart
// being paid (D8), not a credential.
type PaymentHandler struct {
	usecase domain.PaymentUsecase
}

func NewPaymentHandler(usecase domain.PaymentUsecase) PaymentHandler {
	return PaymentHandler{usecase: usecase}
}

// Checkout serves POST /carts/current/checkout. A gateway failure (FR-6
// step 7) is answered 502 rather than the 500 every other
// InternalServerError gets — the body still carries "internal_server_error"
// per api.yaml's ErrorCode enum, only the HTTP status is different (D2's
// PaymentGatewayRepository is what makes this failure distinguishable from
// any other internal error in the first place).
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
