package restapi

import (
	"apps/api/domain/rental"
	apiContract "libs/api-contract"
	"net/http"
)

type RentalHandler struct {
	usecase rental.Usecase
}

func NewRentalHandler(usecase rental.Usecase) RentalHandler {
	return RentalHandler{usecase: usecase}
}

func (handler RentalHandler) GetRentalList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	checkoutStatus := GetCheckoutStatus(r)

	rentals, total, usecaseErr := handler.usecase.GetRentalList(ctx, query, sortBy, order, skip, limit, checkoutStatus)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiRentals := []apiContract.Rental{}
	for _, rental := range rentals {
		apiRentals = append(apiRentals, ToApiRental(rental))
	}

	WriteResponse(w, apiContract.RentalList200Response{Data: apiRentals, Meta: apiContract.MetaPage{Total: total}})
}

func (handler RentalHandler) GetRentalById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetRentalId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	rental, usecaseErr := handler.usecase.GetRentalById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.RentalFindById200Response{Data: ToApiRental(rental)})
}

func (handler RentalHandler) CheckinRentals(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	apiRentalRequests, err := GetRentalRequests(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	rentalRequests := []rental.Rental{}
	for _, apiRental := range apiRentalRequests {
		rentalRequests = append(rentalRequests, ToRental(apiRental))
	}

	if err := handler.usecase.CheckinRentals(ctx, rentalRequests); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler RentalHandler) CheckoutRentals(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rentalIds, err := GetRentalIds(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactionId, usecaseErr := handler.usecase.CheckoutRentals(ctx, rentalIds)

	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.RentalCheckout200Response{Success: true, Data: apiContract.RentalCheckout200ResponseData{TransactionId: transactionId}})
}

func (handler RentalHandler) DeleteRentalById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetRentalId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteRentalById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
