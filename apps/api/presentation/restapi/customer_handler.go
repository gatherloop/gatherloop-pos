package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

// CustomerHandler serves the session-scoped customer read (FR-4). Like
// CartHandler its route is wrapped in RequireSessionId, never CheckAuth — the
// session ID is the capability that owns the name (D8), not a credential.
type CustomerHandler struct {
	usecase domain.CustomerUsecase
}

func NewCustomerHandler(usecase domain.CustomerUsecase) CustomerHandler {
	return CustomerHandler{usecase: usecase}
}

// GetCurrentCustomer returns { name } for the session, or { name: "" } when
// this session has never given one. Never 404 — "no name yet" is the expected
// first-visit state, not an error, exactly as GET /carts/current never 404s
// for a session with no cart.
//
// The name is never logged: it is a person's name, and the order app already
// carries the session ID on every request for support purposes.
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
