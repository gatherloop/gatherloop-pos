package restapi

import (
	"apps/api/domain/reservation"
	apiContract "libs/api-contract"
	"net/http"
)

type ReservationHandler struct {
	usecase reservation.Usecase
}

func NewReservationHandler(usecase reservation.Usecase) ReservationHandler {
	return ReservationHandler{usecase: usecase}
}

func (handler ReservationHandler) GetReservationList(w http.ResponseWriter, r *http.Request) {
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

	reservations, total, usecaseErr := handler.usecase.GetReservationList(ctx, query, sortBy, order, skip, limit, checkoutStatus)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiReservations := []apiContract.Reservation{}
	for _, reservation := range reservations {
		apiReservations = append(apiReservations, ToApiReservation(reservation))
	}

	WriteResponse(w, apiContract.ReservationList200Response{Data: apiReservations, Meta: apiContract.MetaPage{Total: total}})
}

func (handler ReservationHandler) GetReservationById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetReservationId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	reservation, usecaseErr := handler.usecase.GetReservationById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ReservationFindById200Response{Data: ToApiReservation(reservation)})
}

func (handler ReservationHandler) CheckinReservations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	apiReservationRequests, err := GetReservationRequests(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	reservationRequests := []reservation.Reservation{}
	for _, apiReservation := range apiReservationRequests {
		reservationRequests = append(reservationRequests, ToReservation(apiReservation))
	}

	if err := handler.usecase.CheckinReservations(ctx, reservationRequests); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler ReservationHandler) CheckoutReservations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	reservationIds, err := GetReservationIds(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactionId, usecaseErr := handler.usecase.CheckoutReservations(ctx, reservationIds)

	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ReservationCheckout200Response{Success: true, Data: apiContract.ReservationCheckout200ResponseData{TransactionId: transactionId}})
}

func (handler ReservationHandler) DeleteReservationById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetReservationId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteReservationById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
